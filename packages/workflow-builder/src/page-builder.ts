import type { GraphBuilder } from './graph-builder.js';
import { ElementHandleSelector } from './element-handle.js';
import { TrackedValue } from './tracked-value.js';

export type NavigateOptions = {
  url: string | TrackedValue;
};

export class PageBuilder {
  constructor(
    private readonly graph: GraphBuilder,
    readonly pageNodeId: string,
    readonly pageKey: string,
  ) {}

  navigate(opts: NavigateOptions): this {
    const url = opts.url;
    const navigateNodeId = this.graph.addNode(
      'navigate',
      url instanceof TrackedValue ? {} : { url },
      url instanceof TrackedValue ? 'Navigate' : `Navigate to ${url}`,
      this.pageKey,
    );

    if (url instanceof TrackedValue) {
      this.graph.addEdge(url.outputNodeId, 'value', navigateNodeId, 'url');
    }

    this.graph.addEdge(this.pageNodeId, 'pageKey', navigateNodeId, 'pageKey');
    this.graph.connectFlow(navigateNodeId);

    return this;
  }

  select(opts: { selector: string }): ElementHandleSelector {
    const selectNodeId = this.graph.addNode(
      'select',
      { selector: opts.selector, mode: 'one' },
      `Select ${opts.selector}`,
      this.pageKey,
    );

    this.graph.addEdge(this.pageNodeId, 'pageKey', selectNodeId, 'pageKey');
    this.graph.connectFlow(selectNodeId);

    return new ElementHandleSelector(this.graph, selectNodeId, opts.selector);
  }

  click(opts: { selector: string }): this {
    const clickNodeId = this.graph.addNode(
      'click',
      { selector: opts.selector },
      `Click ${opts.selector}`,
      this.pageKey,
    );

    this.graph.addEdge(this.pageNodeId, 'pageKey', clickNodeId, 'pageKey');
    this.graph.connectFlow(clickNodeId);

    return this;
  }

  type(opts: { selector: string; value: string }): this {
    const typeNodeId = this.graph.addNode(
      'type',
      { selector: opts.selector, value: opts.value },
      `Type into ${opts.selector}`,
      this.pageKey,
    );

    this.graph.addEdge(this.pageNodeId, 'pageKey', typeNodeId, 'pageKey');
    this.graph.connectFlow(typeNodeId);

    return this;
  }

  wait(opts: { durationMs?: number; selector?: string }): this {
    const config: Record<string, unknown> = {};
    if (opts.durationMs !== undefined) config.durationMs = opts.durationMs;
    if (opts.selector !== undefined) config.selector = opts.selector;

    const waitNodeId = this.graph.addNode('wait', config, 'Wait', this.pageKey);

    this.graph.addEdge(this.pageNodeId, 'pageKey', waitNodeId, 'pageKey');
    this.graph.connectFlow(waitNodeId);

    return this;
  }

  scroll(opts: { selector?: string; direction?: 'up' | 'down' }): this {
    const config: Record<string, unknown> = {};
    if (opts.selector !== undefined) config.selector = opts.selector;
    if (opts.direction !== undefined) config.direction = opts.direction;

    const scrollNodeId = this.graph.addNode('scroll', config, 'Scroll', this.pageKey);

    this.graph.addEdge(this.pageNodeId, 'pageKey', scrollNodeId, 'pageKey');
    this.graph.connectFlow(scrollNodeId);

    return this;
  }

  extract(opts: { selector: string; property: string; attribute?: string; path?: string }): string {
    const selectNodeId = this.graph.addNode(
      'select',
      { selector: opts.selector, mode: 'one' },
      `Select ${opts.selector}`,
      this.pageKey,
    );

    this.graph.addEdge(this.pageNodeId, 'pageKey', selectNodeId, 'pageKey');
    this.graph.connectFlow(selectNodeId);

    const extractNodeId = this.graph.addNode(
      'extract',
      { property: opts.property, ...(opts.attribute ? { attribute: opts.attribute } : {}) },
      `Extract ${opts.property} from ${opts.selector}`,
      this.pageKey,
    );

    this.graph.addEdge(selectNodeId, 'element', extractNodeId, 'element');
    this.graph.addEdge(this.pageNodeId, 'pageKey', extractNodeId, 'pageKey');
    this.graph.connectFlow(extractNodeId);

    const effectivePath = opts.path ?? `value.${opts.property}`;
    const outputNodeId = this.graph.addNode(
      'output',
      { propertyPath: effectivePath },
      `Output ${opts.property}`,
    );

    this.graph.connectFlow(outputNodeId);
    this.graph.addEdge(extractNodeId, 'value', outputNodeId, 'value');

    return new TrackedValue('', outputNodeId) as unknown as string;
  }

  fetch(opts: { url: string }): string {
    const fetchNodeId = this.graph.addNode('fetch', { url: opts.url }, `Fetch ${opts.url}`);

    this.graph.addEdge(this.pageNodeId, 'pageKey', fetchNodeId, 'pageKey');
    this.graph.connectFlow(fetchNodeId);

    return new TrackedValue('[response]', fetchNodeId) as unknown as string;
  }

  listen(): void {
    const listenNodeId = this.graph.addNode('listen', {}, 'Listen for requests', this.pageKey);
    this.graph.addEdge(this.pageNodeId, 'pageKey', listenNodeId, 'pageKey');
    this.graph.connectFlow(listenNodeId);
  }
}
