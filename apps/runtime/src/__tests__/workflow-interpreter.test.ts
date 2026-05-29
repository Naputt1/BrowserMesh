import { describe, it, expect, vi } from 'vitest';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  WorkflowEvent,
} from '@browsermesh/workflow';
import {
  WorkflowInterpreter,
  type InterpreterOptions,
} from '../interpreter/workflow-interpreter.js';
import type { Page, Locator, CustomHandler } from '../interpreter/types.js';

function mockLocator(): Locator {
  return {
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue('extracted text'),
    getAttribute: vi.fn().mockResolvedValue('attr-value'),
    inputValue: vi.fn().mockResolvedValue('input-value'),
    isVisible: vi.fn().mockResolvedValue(true),
    waitFor: vi.fn().mockResolvedValue(undefined),
    all: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockReturnThis(),
    nth: vi.fn().mockReturnThis(),
    locator: vi.fn().mockReturnThis(),
  };
}

function mockPage(): Page {
  return {
    goto: vi.fn().mockResolvedValue(undefined),
    locator: vi.fn((_sel: string) => mockLocator()),
    evaluate: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('about:blank'),
    addInitScript: vi.fn().mockResolvedValue(undefined),
  };
}

function wf(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return { id: 'test-wf', nodes: [], edges: [], ...overrides };
}

function node(id: string, type: NodeType, config?: Record<string, unknown>): WorkflowNode {
  return { id, type, config };
}

function edge(
  id: string,
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
): WorkflowEdge {
  return { id, source, sourceHandle, target, targetHandle };
}

async function collect(gen: AsyncGenerator<WorkflowEvent>): Promise<WorkflowEvent[]> {
  const events: WorkflowEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

function makeOpts(overrides?: Partial<InterpreterOptions>): InterpreterOptions {
  return { workflow: wf(), page: mockPage(), taskId: 't1', ...overrides };
}

describe('WorkflowInterpreter — basic flow', () => {
  it('executes start → navigate → end linear workflow', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n1', 'navigate', { url: 'https://example.com' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'n1', 'flow'), edge('e2', 'n1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(page.goto).toHaveBeenCalledWith('https://example.com', undefined);
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'task_started',
      'step_started',
      'step_completed',
      'step_started',
      'step_completed',
      'task_completed',
    ]);
  });

  it('emits task_failed when no start node', async () => {
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({ nodes: [node('n1', 'navigate', { url: 'https://x.com' })] }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });

  it('stops at first end node when multiple ends exist', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('nav', 'navigate', { url: 'https://a.com' }),
            node('e1', 'end'),
            node('e2', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'nav', 'flow'), edge('e2', 'nav', 'flow', 'e1', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(page.goto).toHaveBeenCalledTimes(1);
    expect(events.filter((e) => e.type === 'task_completed')).toHaveLength(1);
  });
});

describe('WorkflowInterpreter — select and extract', () => {
  it('selectOne finds element and extract reads text', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'one', selector: 'h1' }),
            node('ext', 'extract', { property: 'text' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'ext', 'flow'),
            edge('e3', 'sel', 'element', 'ext', 'element'),
            edge('e4', 'ext', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(page.locator).toHaveBeenCalledWith('h1');
    expect(loc.nth).toHaveBeenCalledWith(0);
    expect(loc.textContent).toHaveBeenCalled();
    expect(events.filter((e) => e.type === 'step_started')).toHaveLength(3);
    expect(events.filter((e) => e.type === 'step_completed')).toHaveLength(3);
  });

  it('selectAll returns all elements', async () => {
    const page = mockPage();
    const item1 = mockLocator();
    const item2 = mockLocator();
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue([item1, item2]);
    vi.mocked(page.locator).mockReturnValue(parentLoc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'sel', 'flow'), edge('e2', 'sel', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.locator).toHaveBeenCalledWith('.item');
    expect(parentLoc.all).toHaveBeenCalled();
  });

  it('extract with attribute mode reads attribute', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'one', selector: 'a' }),
            node('ext', 'extract', { property: 'attribute', attribute: 'href' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'ext', 'flow'),
            edge('e3', 'sel', 'element', 'ext', 'element'),
            edge('e4', 'ext', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    await collect(intr.execute());
    expect(loc.getAttribute).toHaveBeenCalledWith('href');
  });
});

describe('WorkflowInterpreter — output node', () => {
  it('emits partial_data with correct path', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'one', selector: 'h1' }),
            node('ext', 'extract', { property: 'text' }),
            node('out', 'output', { propertyPath: 'pageTitle' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'ext', 'flow'),
            edge('e3', 'sel', 'element', 'ext', 'element'),
            edge('e4', 'ext', 'flow', 'out', 'flow'),
            edge('e5', 'ext', 'value', 'out', 'value'),
            edge('e6', 'out', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    const partialData = events.filter((e) => e.type === 'partial_data');
    expect(partialData).toHaveLength(1);
    const pd = partialData[0] as Extract<WorkflowEvent, { type: 'partial_data' }>;
    expect(pd.path).toBe('pageTitle');
    expect(pd.value).toBe('extracted text');
  });
});

describe('WorkflowInterpreter — loop with body', () => {
  it('iterates over selectAll results and executes body subgraph', async () => {
    const page = mockPage();
    const itemLoc1 = mockLocator();
    const itemLoc2 = mockLocator();
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue([itemLoc1, itemLoc2]);
    vi.mocked(page.locator).mockReturnValue(parentLoc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('loop', 'loop', {}),
            node('ext', 'extract', { property: 'text' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'loop', 'flow'),
            edge('e3', 'sel', 'element', 'loop', 'items'),
            edge('e4', 'loop', 'body', 'ext', 'flow'),
            edge('e5', 'loop', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    // Body runs twice (once per item), extract reads from currentElement
    expect(itemLoc1.textContent).toHaveBeenCalled();
    expect(itemLoc2.textContent).toHaveBeenCalled();
    // Events: task_started + (step_started+step_completed for start,sel,loop,ext×2) + task_completed
    expect(events.filter((e) => e.type === 'step_started')).toHaveLength(5);
    expect(events.filter((e) => e.type === 'step_completed')).toHaveLength(5);
  });

  it('limits iterations by maxIterations config', async () => {
    const page = mockPage();
    const items = Array.from({ length: 5 }, () => mockLocator());
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue(items);
    vi.mocked(page.locator).mockReturnValue(parentLoc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('loop', 'loop', { maxIterations: 3 }),
            node('ext', 'extract', { property: 'text' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'loop', 'flow'),
            edge('e3', 'sel', 'element', 'loop', 'items'),
            edge('e4', 'loop', 'body', 'ext', 'flow'),
            edge('e5', 'loop', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    await collect(intr.execute());
    expect(items[0].textContent).toHaveBeenCalled();
    expect(items[1].textContent).toHaveBeenCalled();
    expect(items[2].textContent).toHaveBeenCalled();
    expect(items[3].textContent).not.toHaveBeenCalled();
    expect(items[4].textContent).not.toHaveBeenCalled();
  });

  it('output node inside loop with index writes array entries', async () => {
    const page = mockPage();
    const itemLoc1 = mockLocator();
    const itemLoc2 = mockLocator();
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue([itemLoc1, itemLoc2]);
    vi.mocked(page.locator).mockReturnValue(parentLoc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('loop', 'loop', {}),
            node('ext', 'extract', { property: 'text' }),
            node('out', 'output', { propertyPath: 'titles' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'loop', 'flow'),
            edge('e3', 'sel', 'element', 'loop', 'items'),
            edge('e4', 'loop', 'body', 'ext', 'flow'),
            edge('e5', 'ext', 'flow', 'out', 'flow'),
            edge('e6', 'ext', 'value', 'out', 'value'),
            edge('e7', 'loop', 'index', 'out', 'index'),
            edge('e8', 'loop', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    const partialData = events.filter((e) => e.type === 'partial_data') as Extract<
      WorkflowEvent,
      { type: 'partial_data' }
    >[];
    expect(partialData).toHaveLength(2);
    expect(partialData[0].path).toBe('titles[0]');
    expect(partialData[1].path).toBe('titles[1]');
  });
});

describe('WorkflowInterpreter — element input pins', () => {
  it('click uses element from select output', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'one', selector: 'button' }),
            node('clk', 'click', {}),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'clk', 'flow'),
            edge('e3', 'sel', 'element', 'clk', 'element'),
            edge('e4', 'clk', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    await collect(intr.execute());
    // click uses the element from pin, not page.locator
    expect(loc.click).toHaveBeenCalled();
  });

  it('click falls back to inline selector when no element input', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [node('s', 'start'), node('clk', 'click', { selector: '#btn' }), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'clk', 'flow'), edge('e2', 'clk', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.locator).toHaveBeenCalledWith('#btn');
    expect(loc.click).toHaveBeenCalled();
  });
});

describe('WorkflowInterpreter — navigate', () => {
  it('calls page.goto with url', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n1', 'navigate', { url: 'https://example.com' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'n1', 'flow'), edge('e2', 'n1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.goto).toHaveBeenCalledWith('https://example.com', undefined);
  });

  it('passes waitUntil when configured', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n1', 'navigate', { url: 'https://example.com', waitUntil: 'networkidle' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'n1', 'flow'), edge('e2', 'n1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.goto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle' });
  });

  it('fails if url is missing', async () => {
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [node('s', 'start'), node('n1', 'navigate', {}), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'n1', 'flow'), edge('e2', 'n1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });
});

describe('WorkflowInterpreter — click and type', () => {
  it('click calls locator.click with selector', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [node('s', 'start'), node('c1', 'click', { selector: '#btn' }), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'c1', 'flow'), edge('e2', 'c1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.locator).toHaveBeenCalledWith('#btn');
    expect(loc.click).toHaveBeenCalled();
  });

  it('type calls locator.fill with selector and value', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('t1', 'type', { selector: '#input', value: 'hello' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 't1', 'flow'), edge('e2', 't1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.locator).toHaveBeenCalledWith('#input');
    expect(loc.fill).toHaveBeenCalledWith('hello');
  });
});

describe('WorkflowInterpreter — wait', () => {
  it('waits for durationMs', async () => {
    const start = Date.now();
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [node('s', 'start'), node('w1', 'wait', { durationMs: 10 }), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'w1', 'flow'), edge('e2', 'w1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(Date.now() - start).toBeGreaterThanOrEqual(8);
  });

  it('calls locator.waitFor when selector is provided', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('w1', 'wait', { selector: '.loaded' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'w1', 'flow'), edge('e2', 'w1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(loc.waitFor).toHaveBeenCalledWith(expect.objectContaining({ state: 'visible' }));
  });
});

describe('WorkflowInterpreter — scroll', () => {
  it('scrolls to coordinates', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [node('s', 'start'), node('sc', 'scroll', { x: 0, y: 500 }), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'sc', 'flow'), edge('e2', 'sc', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.evaluate).toHaveBeenCalledWith(
      expect.stringContaining('window.scrollBy(0, window.innerHeight / 2)'),
    );
  });

  it('scrolls element into view when selector is provided', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(page.locator).mockReturnValue(loc);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sc', 'scroll', { direction: 'to', selector: '#section' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'sc', 'flow'), edge('e2', 'sc', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.evaluate).toHaveBeenCalledWith(expect.stringContaining('scrollIntoView'));
  });
});

describe('WorkflowInterpreter — custom', () => {
  it('executes a registered custom handler with config', async () => {
    const customFn = vi.fn().mockResolvedValue('custom-result');
    const customHandlers = new Map([['myHandler', customFn as unknown as CustomHandler]]);
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('c1', 'custom', { handlerName: 'myHandler', foo: 'bar' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'c1', 'flow'), edge('e2', 'c1', 'flow', 'e', 'flow')],
        }),
        customHandlers,
      }),
    );
    await collect(intr.execute());
    expect(customFn).toHaveBeenCalledWith(
      expect.objectContaining({ handlerName: 'myHandler', foo: 'bar' }),
      expect.anything(),
    );
  });

  it('fails when handler name is missing', async () => {
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [node('s', 'start'), node('c1', 'custom', {}), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'c1', 'flow'), edge('e2', 'c1', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });
});

describe('WorkflowInterpreter — edge cases', () => {
  it('emits task_failed for unknown node type', async () => {
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('x', 'nonexistent_type' as NodeType, {}),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'x', 'flow'), edge('e2', 'x', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'task_failed', errorCode: 'UNKNOWN_NODE_TYPE' }),
    );
  });

  it('detects cycles in the flow graph', async () => {
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('a', 'navigate', { url: 'https://x.com' }),
            node('b', 'navigate', { url: 'https://y.com' }),
          ],
          edges: [
            edge('e1', 's', 'flow', 'a', 'flow'),
            edge('e2', 'a', 'flow', 'b', 'flow'),
            edge('e3', 'b', 'flow', 'a', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed' && e.errorCode === 'CYCLE_DETECTED')).toBe(
      true,
    );
  });

  it('cancellation emits task_failed when signal is already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const intr = new WorkflowInterpreter(
      makeOpts({
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n1', 'navigate', { url: 'https://x.com' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'n1', 'flow'), edge('e2', 'n1', 'flow', 'e', 'flow')],
        }),
        signal: ctrl.signal,
      }),
    );
    const events = await collect(intr.execute());
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'task_failed', errorCode: 'CANCELLED' }),
    );
  });
});

describe('WorkflowInterpreter — event ordering', () => {
  it('emits events in correct order for linear workflow', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n1', 'navigate', { url: 'https://example.com' }),
            node('n2', 'click', { selector: '#btn' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'n1', 'flow'),
            edge('e2', 'n1', 'flow', 'n2', 'flow'),
            edge('e3', 'n2', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      'task_started',
      'step_started',
      'step_completed',
      'step_started',
      'step_completed',
      'step_started',
      'step_completed',
      'task_completed',
    ]);
    const stepStarted = events.filter((e) => e.type === 'step_started') as Extract<
      WorkflowEvent,
      { type: 'step_started' }
    >[];
    expect(stepStarted[0].stepId).toBe('s');
    expect(stepStarted[1].stepId).toBe('n1');
    expect(stepStarted[2].stepId).toBe('n2');
  });

  it('reports correct step types in events', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('nav', 'navigate', { url: 'https://x.com' }),
            node('clk', 'click', { selector: '#go' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'nav', 'flow'),
            edge('e2', 'nav', 'flow', 'clk', 'flow'),
            edge('e3', 'clk', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    const failures = events.filter((e) => e.type === 'task_failed');
    expect(failures).toHaveLength(0);
    expect(events[0].type).toBe('task_started');
    expect(events[events.length - 1].type).toBe('task_completed');
  });
});
