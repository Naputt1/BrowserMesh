import type { WorkflowNode, WorkflowEdge } from '@browsermesh/workflow';
import type { NodeType } from '@browsermesh/workflow';

const ignore = undefined;

type LoopScope = {
  readonly loopNodeId: string;
  readonly bodyNodeIds: string[];
};

export class GraphBuilder {
  private _nodes: WorkflowNode[] = [];
  private _edges: WorkflowEdge[] = [];
  private _counter = 0;
  private _flowSource: string | null = null;
  private _loopScopes: LoopScope[] = [];
  private _loopBodyPending: boolean[] = [];

  get nodes(): readonly WorkflowNode[] {
    return this._nodes;
  }

  get edges(): readonly WorkflowEdge[] {
    return this._edges;
  }

  addNode(
    type: NodeType,
    config?: Record<string, unknown>,
    label?: string,
    pageId?: string,
  ): string {
    const id = `n_${++this._counter}`;
    const node: WorkflowNode = {
      id,
      type,
      ...(label ? { label } : {}),
      ...(config && Object.keys(config).length > 0 ? { config } : {}),
      ...(pageId ? { pageId } : {}),
    };
    if (this.isInLoop()) {
      const scope = this._loopScopes[this._loopScopes.length - 1];
      scope.bodyNodeIds.push(id);
    }
    this._nodes.push(node);
    return id;
  }

  addEdge(source: string, sourceHandle: string, target: string, targetHandle: string): void {
    const id = `e_${++this._counter}`;
    this._edges.push({ id, source, sourceHandle, target, targetHandle });
  }

  connectFlow(targetNodeId: string): void {
    if (this.isInLoop() && this._loopBodyPending[this._loopBodyPending.length - 1]) {
      const loopNodeId = this.currentLoopNodeId()!;
      this.addEdge(loopNodeId, 'body', targetNodeId, 'flow');
      this._loopBodyPending[this._loopBodyPending.length - 1] = false;
    } else {
      const source = this._flowSource;
      if (source) {
        this.addEdge(source, 'flow', targetNodeId, 'flow');
      }
    }
    this._flowSource = targetNodeId;
  }

  setFlowSource(nodeId: string | null): void {
    this._flowSource = nodeId;
  }

  getFlowSource(): string | null {
    return this._flowSource;
  }

  beginLoop(itemsNodeId: string, config?: Record<string, unknown>, label?: string): string {
    const loopNodeId = this.addNode('loop', config, label);
    this.connectFlow(loopNodeId);
    this.addEdge(itemsNodeId, 'element', loopNodeId, 'items');
    this._loopScopes.push({ loopNodeId, bodyNodeIds: [] });
    this._loopBodyPending.push(true);
    return loopNodeId;
  }

  endLoop(): void {
    const scope = this._loopScopes.pop();
    if (!scope) return;
    this._loopBodyPending.pop();
    this._flowSource = scope.loopNodeId;
  }

  isInLoop(): boolean {
    return this._loopScopes.length > 0;
  }

  currentLoopNodeId(): string | null {
    if (this._loopScopes.length === 0) return null;
    return this._loopScopes[this._loopScopes.length - 1].loopNodeId;
  }

  connectDataInLoop(
    source: string,
    sourceHandle: string,
    target: string,
    targetHandle: string,
  ): void {
    this.addEdge(source, sourceHandle, target, targetHandle);
  }

  setOutputPropertyPath(outputNodeId: string, path: string): void {
    const node = this._nodes.find((n) => n.id === outputNodeId);
    if (node) {
      const config = node.config ?? {};
      config.propertyPath = path;
      (node as { config?: Record<string, unknown> }).config = config;
    }
  }

  getWorkflowId(): string {
    return `wf_${Date.now()}`;
  }
}
