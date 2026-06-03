import type { WorkflowIR, DataType, DataTypeField, GlobalSettings } from '@browsermesh/workflow';
import { GraphBuilder } from './graph-builder.js';
import { PageBuilder } from './page-builder.js';
import { TrackedValue } from './tracked-value.js';

export class WorkflowBuilder {
  readonly graph: GraphBuilder = new GraphBuilder();
  private startNodeId: string | null = null;
  private endNodeId: string | null = null;

  createPage(): PageBuilder {
    const pageKey = crypto.randomUUID();
    const pageNodeId = this.graph.addNode('page', {}, 'Create page');
    this.graph.connectFlow(pageNodeId);

    return new PageBuilder(this.graph, pageNodeId, pageKey);
  }

  addStartNode(): void {
    this.startNodeId = this.graph.addNode('start', {}, 'Start');
    this.graph.connectFlow(this.startNodeId);
  }

  addEndNode(): void {
    this.endNodeId = this.graph.addNode('end', {}, 'End');
    this.graph.connectFlow(this.endNodeId);
  }

  toIR(workflowName?: string): WorkflowIR {
    const nodes = [...this.graph.nodes];
    const edges = [...this.graph.edges];

    return {
      id: this.graph.getWorkflowId(),
      name: workflowName,
      nodes,
      edges,
    };
  }
}

export type WorkflowOptions = {
  readonly source?: import('@browsermesh/runtime-loader').WorkflowSource;
  readonly taskId?: string;
  readonly endpoint?: string;
};

export class WorkflowHandle<TOutput = unknown, TState = unknown> {
  private ir: WorkflowIR | null = null;

  constructor(
    ir: WorkflowIR | null,
    private readonly name?: string,
  ) {
    this.ir = ir;
  }

  setIR(ir: WorkflowIR): void {
    this.ir = ir;
  }

  getIR(): WorkflowIR | null {
    return this.ir;
  }

  async run(options?: WorkflowOptions): Promise<TOutput> {
    let ir = this.ir;

    if (options?.source) {
      const { resolveWorkflow } = await import('@browsermesh/runtime-loader');
      ir = await resolveWorkflow(options.source as any);
    }

    if (!ir) {
      throw new Error(
        'No workflow IR available. Either compile the workflow first, ' +
        'or provide a source option (URL, S3, inline, etc.).',
      );
    }

    const { BrowserMeshClient } = await import('@browsermesh/sdk');
    const endpoint = options?.endpoint ?? 'localhost:50051';
    const client = new BrowserMeshClient({ endpoint });
    const taskId = options?.taskId ?? crypto.randomUUID();

    let result: unknown;

    for await (const event of client.executeWorkflow({
      taskId,
      workflow: ir as any,
    })) {
      if (event.type === 'task_completed') {
        result = event.result;
      }
      if (event.type === 'task_failed') {
        throw new Error(`Workflow failed: ${event.message}`);
      }
    }

    return result as TOutput;
  }
}

function deriveOutputType(obj: unknown): DataType {
  if (obj instanceof TrackedValue) {
    return { kind: 'string' as const };
  }
  if (obj === null || obj === undefined) {
    return { kind: 'object' as const };
  }
  if (typeof obj === 'string') return { kind: 'string' as const };
  if (typeof obj === 'number') return { kind: 'number' as const };
  if (typeof obj === 'boolean') return { kind: 'boolean' as const };
  if (Array.isArray(obj)) {
    const elementType: DataType = obj.length > 0 ? deriveOutputType(obj[0]) : { kind: 'string' as const };
    return { kind: 'array' as const, elementType };
  }
  if (typeof obj === 'object') {
    const fields: DataTypeField[] = Object.entries(obj).map(([name, val]) => ({
      name,
      type: deriveOutputType(val),
    }));
    return { kind: 'object' as const, fields };
  }
  return { kind: 'string' as const };
}

function assignOutputPaths(
  obj: unknown,
  pathSegments: (string | { array: true })[],
  graph: GraphBuilder,
): void {
  if (obj instanceof TrackedValue) {
    let fullPath = '';
    for (const s of pathSegments) {
      if (typeof s === 'string') {
        fullPath += fullPath ? `.${s}` : s;
      } else {
        fullPath += '[]';
      }
    }
    graph.setOutputPropertyPath(obj.outputNodeId, fullPath);
    return;
  }
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      assignOutputPaths(obj[0], [...pathSegments, { array: true }], graph);
    }
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      assignOutputPaths(val, [...pathSegments, key], graph);
    }
  }
}

function createWorkflowHandle<TOutput, TState>(
  builderFn: (wf: WorkflowBuilder) => TOutput,
  name?: string,
): WorkflowHandle<TOutput, TState> {
  const wf = new WorkflowBuilder();
  wf.addStartNode();

  const output = builderFn(wf);

  wf.addEndNode();

  assignOutputPaths(output, [], wf.graph);

  const outputType = deriveOutputType(output);
  const base = wf.toIR(name);
  const settings: GlobalSettings = {
    ...base.settings,
    outputType,
  };
  const ir: WorkflowIR = { ...base, settings };

  const handle = new WorkflowHandle<TOutput, TState>(ir, name);
  return handle;
}

export function createWorkflow<TOutput = unknown, TState = unknown>(
  builderFn: (wf: WorkflowBuilder) => TOutput,
): WorkflowHandle<TOutput, TState> {
  return createWorkflowHandle<TOutput, TState>(builderFn);
}

export function createWorkflowLoader<TOutput = unknown, TState = unknown>(
  ir: WorkflowIR,
  name?: string,
): WorkflowHandle<TOutput, TState> {
  return new WorkflowHandle<TOutput, TState>(ir, name);
}
