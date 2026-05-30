import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEvent,
  GlobalSettings,
} from '@browsermesh/workflow';
import type { DebugNodeHandler, DebugExecutionContext } from './types';
import { CDPClient } from './cdp-client';
import { debugHandlerRegistry } from './handlers/index';

export type DebugInterpreterOptions = {
  readonly workflow: WorkflowDefinition;
  readonly cdp: CDPClient;
  readonly taskId: string;
  readonly handlerRegistry?: ReadonlyMap<string, DebugNodeHandler>;
  readonly defaultSessionId?: string;
};

export class DebugInterpreter {
  private readonly workflow: WorkflowDefinition;
  private readonly cdp: CDPClient;
  private readonly handlerRegistry: ReadonlyMap<string, DebugNodeHandler>;
  private readonly taskId: string;
  private readonly nodeMap: Map<string, WorkflowNode>;
  private readonly nodeOutputs: Map<string, Map<string, unknown>> = new Map();
  private readonly result: Record<string, unknown> = {};
  private readonly pageSessions = new Map<string, { targetId: string; sessionId: string }>();
  private cancelled = false;
  private stepMode = false;
  private stepResolve: (() => void) | null = null;
  private defaultSessionId: string | undefined;

  constructor(options: DebugInterpreterOptions) {
    this.workflow = options.workflow;
    this.cdp = options.cdp;
    this.handlerRegistry = options.handlerRegistry ?? debugHandlerRegistry;
    this.taskId = options.taskId;
    this.nodeMap = new Map(options.workflow.nodes.map((n) => [n.id, n]));
    this.defaultSessionId = options.defaultSessionId;
  }

  async *execute(stepMode = false): AsyncGenerator<WorkflowEvent> {
    this.stepMode = stepMode;
    this.cancelled = false;

    if (this.cancelled) {
      yield this.makeEvent('task_failed', {
        errorCode: 'CANCELLED',
        message: 'Debug was cancelled before execution started',
        retryable: false,
      });
      return;
    }

    yield this.makeEvent('task_started', { workflowId: this.workflow.id });

    const startNode = this.findStartNode();
    if (!startNode) {
      yield this.makeEvent('task_failed', {
        errorCode: 'NO_START_NODE',
        message: 'Workflow must have a start node',
        retryable: false,
      });
      return;
    }

    yield* this.executeFlow(startNode.id);

    if (!this.cancelled) {
      yield this.makeEvent('task_completed', { result: { ...this.result } });
    }
  }

  step(): void {
    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  }

  continue(): void {
    this.stepMode = false;
    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  }

  cancel(): void {
    this.cancelled = true;
    this.stepMode = false;
    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  }

  private async *executeFlow(
    startNodeId: string,
    contextOverride?: Partial<DebugExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    let currentId: string | null = startNodeId;
    const visited = new Set<string>();

    while (currentId) {
      if (this.cancelled) {
        yield this.makeEvent('task_failed', {
          errorCode: 'CANCELLED',
          message: 'Debug was cancelled during execution',
          retryable: false,
        });
        return;
      }

      if (visited.has(currentId)) {
        yield this.makeEvent('task_failed', {
          errorCode: 'CYCLE_DETECTED',
          message: 'Cycle detected in flow graph',
          retryable: false,
        });
        return;
      }
      visited.add(currentId);

      const node = this.nodeMap.get(currentId);
      if (!node) {
        yield this.makeEvent('task_failed', {
          errorCode: 'UNKNOWN_NODE',
          message: `Node not found: ${currentId}`,
          retryable: false,
        });
        return;
      }

      if (node.type === 'end') {
        return;
      }

      if (this.stepMode && visited.size > 1) {
        yield this.makeEvent('step_paused', {
          stepId: node.id,
          stepType: node.type,
        });
        await new Promise<void>((resolve) => {
          this.stepResolve = resolve;
        });
        if (this.cancelled) return;
      }

      yield* this.executeNode(node, contextOverride);

      const nextEdge = this.workflow.edges.find(
        (e) => e.source === currentId && e.sourceHandle === 'flow',
      );
      currentId = nextEdge?.target ?? null;
    }
  }

  private async *executeNode(
    node: WorkflowNode,
    contextOverride?: Partial<DebugExecutionContext>,
  ): AsyncGenerator<WorkflowEvent> {
    const handler = this.handlerRegistry.get(node.type);
    if (!handler) {
      yield this.makeEvent('task_failed', {
        errorCode: 'UNKNOWN_NODE_TYPE',
        message: `No handler registered for node type: ${node.type}`,
        retryable: false,
      });
      return;
    }

    const inputs = this.resolveInputs(node);
    const setOutput = (pin: string, value: unknown) => this.setNodeOutput(node.id, pin, value);

    const controlSignal = { value: undefined as 'break' | 'continue' | undefined };

    yield this.makeEvent('step_started', { stepId: node.id, stepType: node.type });

    try {
      const gen = handler(
        node,
        this.createContext(setOutput, controlSignal, contextOverride),
        inputs,
        (startHandle, childOverride) =>
          this.executeSubgraph(node.id, startHandle, childOverride),
      );

      for await (const event of gen) {
        if (event.type === 'partial_data') {
          this.setResultValue((event as any).path, (event as any).value);
        }
        yield event;
      }
    } catch (err) {
      yield this.makeEvent('task_failed', {
        errorCode: 'HANDLER_ERROR',
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      });
      return;
    }

    yield this.makeEvent('step_completed', { stepId: node.id });
  }

  private async *executeSubgraph(
    parentNodeId: string,
    startHandle: string,
    contextOverride?: Partial<DebugExecutionContext>,
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
      (e) => e.target === node.id && e.targetHandle !== 'flow',
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
    return this.workflow.nodes.find((n) => n.type === 'start');
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
      obj[seg] = obj[seg] ?? {};
      obj = obj[seg];
    }
    const last = segments[segments.length - 1];
    obj[last] = value;
  }

  private parsePath(path: string): (string | number)[] {
    const segments: (string | number)[] = [];
    let current = '';
    let inBracket = false;

    for (const ch of path) {
      if (ch === '[') {
        if (current) segments.push(current);
        current = '';
        inBracket = true;
      } else if (ch === ']') {
        if (current) {
          const num = Number(current);
          segments.push(isNaN(num) ? current : num);
          current = '';
        }
        inBracket = false;
      } else if (ch === '.' && !inBracket) {
        if (current) segments.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    if (current) segments.push(current);
    return segments;
  }

  private createContext(
    setOutput: (pin: string, value: unknown) => void,
    controlSignal: { value: 'break' | 'continue' | undefined },
    contextOverride?: Partial<DebugExecutionContext>,
  ): DebugExecutionContext {
    const base: DebugExecutionContext = {
      taskId: this.taskId,
      cdp: this.cdp,
      defaultSessionId: this.defaultSessionId,
      pageSessions: this.pageSessions as any,
      globalSettings: this.workflow.settings,
      controlSignal,
      setOutput,
      getSession: (pageKey?: string) => {
        if (pageKey) {
          const info = this.pageSessions.get(pageKey);
          return info?.sessionId ?? this.defaultSessionId;
        }
        return this.defaultSessionId;
      },
      ...contextOverride,
    };
    return base;
  }

  private makeEvent<T extends WorkflowEvent['type']>(
    type: T,
    props: Omit<Extract<WorkflowEvent, { type: T }>, 'type' | 'taskId' | 'timestamp'>,
  ): WorkflowEvent {
    return {
      type,
      taskId: this.taskId,
      timestamp: new Date().toISOString(),
      ...props,
    } as WorkflowEvent;
  }
}
