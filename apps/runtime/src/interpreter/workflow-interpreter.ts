import type { WorkflowDefinition, WorkflowNode, WorkflowEvent } from "@browsermesh/workflow";
import type { Page, ExecutionContext, NodeHandler, CustomHandler } from "./types.js";
import type { PauseController } from "../pause-controller.js";
import { defaultHandlerRegistry } from "./handlers/index.js";

export type InterpreterOptions = {
  readonly workflow: WorkflowDefinition;
  readonly page: Page;
  readonly customHandlers?: ReadonlyMap<string, CustomHandler>;
  readonly handlerRegistry?: ReadonlyMap<string, NodeHandler>;
  readonly taskId: string;
  readonly signal?: AbortSignal;
  readonly pauseController?: PauseController;
};

export class WorkflowInterpreter {
  private readonly workflow: WorkflowDefinition;
  private readonly page: Page;
  private readonly handlerRegistry: ReadonlyMap<string, NodeHandler>;
  private readonly customHandlers: ReadonlyMap<string, CustomHandler>;
  private readonly taskId: string;
  private readonly signal: AbortSignal;
  private readonly pauseController?: PauseController;
  private readonly nodeMap: Map<string, WorkflowNode>;

  private readonly nodeOutputs: Map<string, Map<string, unknown>> = new Map();
  private readonly result: Record<string, unknown> = {};

  constructor(options: InterpreterOptions) {
    this.workflow = options.workflow;
    this.page = options.page;
    this.customHandlers = options.customHandlers ?? new Map();
    this.handlerRegistry = options.handlerRegistry ?? defaultHandlerRegistry;
    this.taskId = options.taskId;
    this.signal = options.signal ?? new AbortController().signal;
    this.pauseController = options.pauseController;
    this.nodeMap = new Map(options.workflow.nodes.map((n) => [n.id, n]));
  }

  async *execute(): AsyncGenerator<WorkflowEvent> {
    if (this.signal.aborted) {
      yield this.makeEvent("task_failed", {
        errorCode: "CANCELLED",
        message: "Task was cancelled before execution started",
        retryable: false,
      });
      return;
    }

    yield this.makeEvent("task_started", { workflowId: this.workflow.id });

    const startNode = this.findStartNode();
    if (!startNode) {
      yield this.makeEvent("task_failed", {
        errorCode: "NO_START_NODE",
        message: "Workflow must have a start node",
        retryable: false,
      });
      return;
    }

    yield* this.executeFlow(startNode.id);

    yield this.makeEvent("task_completed", { result: { ...this.result } });
  }

  private async *executeFlow(
    startNodeId: string,
    contextOverride?: Partial<ExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    let currentId: string | null = startNodeId;
    const visited = new Set<string>();

    while (currentId) {
      if (this.signal.aborted) {
        yield this.makeEvent("task_failed", {
          errorCode: "CANCELLED",
          message: "Task was cancelled during execution",
          retryable: false,
        });
        return;
      }

      if (visited.has(currentId)) {
        yield this.makeEvent("task_failed", {
          errorCode: "CYCLE_DETECTED",
          message: "Cycle detected in flow graph",
          retryable: false,
        });
        return;
      }
      visited.add(currentId);

      const node = this.nodeMap.get(currentId);
      if (!node) {
        yield this.makeEvent("task_failed", {
          errorCode: "UNKNOWN_NODE",
          message: `Node not found: ${currentId}`,
          retryable: false,
        });
        return;
      }

      if (node.type === "end") {
        return;
      }

      await this.pauseController?.waitIfPaused();
      yield* this.executeNode(node, contextOverride);

      const nextEdge = this.workflow.edges.find(
        (e) => e.source === currentId && e.sourceHandle === "flow",
      );
      currentId = nextEdge?.target ?? null;
    }
  }

  private async *executeNode(
    node: WorkflowNode,
    contextOverride?: Partial<ExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    const handler = this.handlerRegistry.get(node.type);
    if (!handler) {
      yield this.makeEvent("task_failed", {
        errorCode: "UNKNOWN_NODE_TYPE",
        message: `No handler registered for node type: ${node.type}`,
        retryable: false,
      });
      return;
    }

    const inputs = this.resolveInputs(node);
    const baseContext = this.createBaseContext();
    const setOutput = (pin: string, value: unknown) => {
      this.setNodeOutput(node.id, pin, value);
    };

    const nodeContext: ExecutionContext = {
      ...baseContext,
      ...contextOverride,
      setOutput,
    };

    yield this.makeEvent("step_started", { stepId: node.id, stepType: node.type });

    try {
      const gen = handler(
        node,
        nodeContext,
        inputs,
        (startHandle, childOverride) =>
          this.executeSubgraph(node.id, startHandle, {
            ...baseContext,
            ...contextOverride,
            ...childOverride,
            setOutput,
          }),
      );

      for await (const event of gen) {
        if (event.type === "partial_data") {
          this.setResultValue(event.path, event.value);
        }
        yield event;
      }
    } catch (err) {
      yield this.makeEvent("task_failed", {
        errorCode: "HANDLER_ERROR",
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      });
      return;
    }

    yield this.makeEvent("step_completed", { stepId: node.id });
  }

  private async *executeSubgraph(
    parentNodeId: string,
    startHandle: string,
    contextOverride?: Partial<ExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    const bodyEdge = this.workflow.edges.find(
      (e) => e.source === parentNodeId && e.sourceHandle === startHandle,
    );
    if (!bodyEdge) return;

    yield* this.executeFlow(bodyEdge.target, contextOverride);
  }

  private resolveInputs(node: WorkflowNode): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};
    const incoming = this.workflow.edges.filter(
      (e) => e.target === node.id && e.targetHandle !== "flow",
    );
    for (const edge of incoming) {
      const outputs = this.nodeOutputs.get(edge.source);
      if (outputs?.has(edge.sourceHandle)) {
        inputs[edge.targetHandle] = outputs.get(edge.sourceHandle);
      }
    }
    return inputs;
  }

  private findStartNode(): WorkflowNode | undefined {
    return this.workflow.nodes.find((n) => n.type === "start");
  }

  private setNodeOutput(nodeId: string, pin: string, value: unknown): void {
    let outputs = this.nodeOutputs.get(nodeId);
    if (!outputs) {
      outputs = new Map();
      this.nodeOutputs.set(nodeId, outputs);
    }
    outputs.set(pin, value);
  }

  private setResultValue(path: string, value: unknown): void {
    const segments = this.parsePath(path);
    if (segments.length === 0) return;

    let obj: any = this.result;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (typeof seg === "number") {
        obj[seg] = obj[seg] ?? {};
        obj = obj[seg];
      } else {
        obj[seg] = obj[seg] ?? {};
        obj = obj[seg];
      }
    }
    const last = segments[segments.length - 1];
    obj[last] = value;
  }

  private parsePath(path: string): (string | number)[] {
    const segments: (string | number)[] = [];
    let current = "";
    let inBracket = false;

    for (const ch of path) {
      if (ch === "[") {
        if (current) segments.push(current);
        current = "";
        inBracket = true;
      } else if (ch === "]") {
        if (current) {
          const num = Number(current);
          segments.push(isNaN(num) ? current : num);
          current = "";
        }
        inBracket = false;
      } else if (ch === "." && !inBracket) {
        if (current) segments.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current) segments.push(current);
    return segments;
  }

  private createBaseContext(): ExecutionContext {
    return {
      taskId: this.taskId,
      signal: this.signal,
      page: this.page,
      getCustomHandler: (name: string) => this.customHandlers.get(name),
      pauseController: this.pauseController,
      setOutput: () => {},
    };
  }

  private makeEvent<T extends WorkflowEvent["type"]>(
    type: T,
    props: Omit<Extract<WorkflowEvent, { type: T }>, "type" | "taskId" | "timestamp">,
  ): WorkflowEvent {
    return {
      type,
      taskId: this.taskId,
      timestamp: new Date().toISOString(),
      ...props,
    } as WorkflowEvent;
  }
}
