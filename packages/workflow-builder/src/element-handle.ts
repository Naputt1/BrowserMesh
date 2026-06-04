import type { GraphBuilder } from './graph-builder.js';
import { TrackedValue } from './tracked-value.js';

function addExtractOutputNodes(
  graph: GraphBuilder,
  elementSourceId: string,
  property: string,
  attribute?: string,
  path?: string,
): string {
  const isInLoop = graph.isInLoop();
  const loopNodeId = graph.currentLoopNodeId();

  const config: Record<string, unknown> = { property };
  if (attribute) config.attribute = attribute;

  const extractNodeId = graph.addNode('extract', config, `Extract ${property}`);

  if (isInLoop && loopNodeId) {
    graph.connectDataInLoop(loopNodeId, 'item', extractNodeId, 'element');
  } else {
    graph.addEdge(elementSourceId, 'element', extractNodeId, 'element');
  }

  graph.connectFlow(extractNodeId);

  const effectivePath = path ?? 'value';
  const outputNodeId = graph.addNode(
    'output',
    { propertyPath: effectivePath },
    `Output ${property}`,
  );

  graph.connectFlow(outputNodeId);
  graph.addEdge(extractNodeId, 'value', outputNodeId, 'value');

  if (isInLoop && loopNodeId) {
    graph.addEdge(loopNodeId, 'index', outputNodeId, 'index');
  }

  return outputNodeId;
}

function addClickNode(graph: GraphBuilder, elementSourceId: string): string {
  const isInLoop = graph.isInLoop();
  const loopNodeId = graph.currentLoopNodeId();

  const clickNodeId = graph.addNode('click', {}, 'Click');

  if (isInLoop && loopNodeId) {
    graph.connectDataInLoop(loopNodeId, 'item', clickNodeId, 'element');
  } else {
    graph.addEdge(elementSourceId, 'element', clickNodeId, 'element');
  }

  graph.connectFlow(clickNodeId);

  return clickNodeId;
}

export class ElementHandle {
  constructor(
    protected readonly graph: GraphBuilder,
    readonly nodeId: string,
  ) {}

  text(path?: string): string {
    const outputNodeId = addExtractOutputNodes(this.graph, this.nodeId, 'text', undefined, path);
    return new TrackedValue('', outputNodeId) as unknown as string;
  }

  extract(property: string, attribute?: string, path?: string): string {
    const outputNodeId = addExtractOutputNodes(this.graph, this.nodeId, property, attribute, path);
    return new TrackedValue('', outputNodeId) as unknown as string;
  }

  click(): void {
    addClickNode(this.graph, this.nodeId);
  }
}

export class ElementHandleSelector extends ElementHandle {
  constructor(
    graph: GraphBuilder,
    nodeId: string,
    private readonly selector: string,
  ) {
    super(graph, nodeId);
  }

  selectAll(): LoopItems {
    const node = this.graph['_nodes'].find((n: { id: string }) => n.id === this.nodeId);
    if (node) {
      const config = node.config ?? {};
      config.mode = 'all';
      (node as { config?: Record<string, unknown> }).config = config;
    }

    return new LoopItems(this.graph, this.nodeId, `Loop through ${this.selector}`);
  }
}

export class LoopItems implements Iterable<ElementHandle> {
  constructor(
    private readonly graph: GraphBuilder,
    private readonly itemsNodeId: string,
    private readonly label?: string,
  ) {}

  [Symbol.iterator](): Iterator<ElementHandle> {
    const loopNodeId = this.graph.beginLoop(
      this.itemsNodeId,
      {},
      this.label ?? 'Loop through items',
    );

    const handle = new ElementHandle(this.graph, loopNodeId);

    let yielded = false;
    return {
      next: () => {
        if (yielded) {
          this.graph.endLoop();
          return { done: true, value: undefined as unknown as ElementHandle };
        }
        yielded = true;
        return { done: false, value: handle };
      },
      return: () => {
        this.graph.endLoop();
        return { done: true, value: undefined as unknown as ElementHandle };
      },
    };
  }
}
