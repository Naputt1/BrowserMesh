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

    const ordered = this.orderNodes();
    const visited = new Set<string>();

    const childIds = this.collectChildNodeIds();

    for (const node of ordered) {
      if (visited.has(node.id)) continue;
      if (childIds.has(node.id)) continue;
      visited.add(node.id);

      if (this.signal.aborted) {
        yield this.makeEvent("task_failed", {
          errorCode: "CANCELLED",
          message: "Task was cancelled during execution",
          retryable: false,
        });
        return;
      }

      await this.pauseController?.waitIfPaused();
      yield* this.executeNode(node);
    }

    yield this.makeEvent("task_completed", {});
  }

  private async *executeNode(node: WorkflowNode): AsyncGenerator<WorkflowEvent> {
    const handler = this.handlerRegistry.get(node.type);
    if (!handler) {
      yield this.makeEvent("task_failed", {
        errorCode: "UNKNOWN_NODE_TYPE",
        message: `No handler registered for node type: ${node.type}`,
        retryable: false,
      });
      return;
    }

    yield this.makeEvent("step_started", { stepId: node.id, stepType: node.type });

    try {
      const context = this.createContext();
      const gen = handler(node, context, this.executeChildren.bind(this));
      for await (const event of gen) {
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

    yield this.makeEvent("step_completed", { stepId: node.id, output: undefined });
  }

  private async *executeChildren(
    nodeIds: string[],
    contextOverride?: Partial<ExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    for (const id of nodeIds) {
      const node = this.nodeMap.get(id);
      if (!node) {
        yield this.makeEvent("task_failed", {
          errorCode: "UNKNOWN_CHILD_NODE",
          message: `Child node not found: ${id}`,
          retryable: false,
        });
        return;
      }

      const handler = this.handlerRegistry.get(node.type);
      if (!handler) {
        yield this.makeEvent("task_failed", {
          errorCode: "UNKNOWN_NODE_TYPE",
          message: `No handler registered for child node type: ${node.type}`,
          retryable: false,
        });
        return;
      }

      await this.pauseController?.waitIfPaused();
      yield this.makeEvent("step_started", { stepId: node.id, stepType: node.type });

      try {
        const context = { ...this.createContext(), ...contextOverride };
        const gen = handler(node, context, (ids, ov) => this.executeChildren(ids, { ...contextOverride, ...ov }));
        for await (const event of gen) {
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

      yield this.makeEvent("step_completed", { stepId: node.id, output: undefined });
    }
  }

  private createContext(): ExecutionContext {
    return {
      taskId: this.taskId,
      signal: this.signal,
      page: this.page,
      getCustomHandler: (name: string) => this.customHandlers.get(name),
      pauseController: this.pauseController,
    };
  }

  private orderNodes(): WorkflowNode[] {
    const nodes = this.workflow.nodes;
    const edges = this.workflow.edges;

    const inDegree = new Map<string, number>();
    for (const n of nodes) inDegree.set(n.id, 0);
    for (const e of edges) {
      inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDegree) {
      if (deg === 0) queue.push(id);
    }

    const ordered: WorkflowNode[] = [];
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    while (queue.length > 0) {
      const id = queue.shift()!;
      const node = nodeMap.get(id);
      if (node) ordered.push(node);
      for (const e of edges) {
        if (e.source === id) {
          const newDeg = (inDegree.get(e.target) ?? 1) - 1;
          inDegree.set(e.target, newDeg);
          if (newDeg === 0) queue.push(e.target);
        }
      }
    }

    return ordered;
  }

  private collectChildNodeIds(): Set<string> {
    const ids = new Set<string>();
    for (const node of this.workflow.nodes) {
      const childIds = node.config?.childNodeIds as string[] | undefined;
      if (childIds) for (const id of childIds) ids.add(id);
    }
    return ids;
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
