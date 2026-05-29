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
import type { Page, Locator, ExecutionContext, NodeHandler } from '../interpreter/types.js';
import { GlobalStateStore } from '../global-state-store.js';
import { compareHandler } from '../interpreter/handlers/compare.js';
import { andHandler } from '../interpreter/handlers/and.js';
import { orHandler } from '../interpreter/handlers/or.js';
import { notHandler } from '../interpreter/handlers/not.js';
import { ifHandler } from '../interpreter/handlers/if.js';
import { switchHandler } from '../interpreter/handlers/switch.js';
import { breakHandler } from '../interpreter/handlers/break.js';
import { continueHandler } from '../interpreter/handlers/continue.js';

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

// ---------------------------------------------------------------------------
// compare handler — direct unit tests
// ---------------------------------------------------------------------------

describe('compareHandler — direct', () => {
  function makeContext(
    setOutput = vi.fn(),
    overrides?: Partial<ExecutionContext>,
  ): ExecutionContext {
    return {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput,
      ...overrides,
    } as unknown as ExecutionContext;
  }

  async function runHandler(
    node: WorkflowNode,
    context: ExecutionContext,
    inputs: Record<string, unknown>,
  ) {
    const gen = compareHandler(node, context, inputs);
    for await (const _ of gen) {
    }
  }

  it('equals — true when values match', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'equals' } };
    await runHandler(node, makeContext(setOutput), { left: 42, right: 42 });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('equals — false when values differ', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'equals' } };
    await runHandler(node, makeContext(setOutput), { left: 'foo', right: 'bar' });
    expect(setOutput).toHaveBeenCalledWith('result', false);
  });

  it('not_equals — true when values differ', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: '!=' } };
    await runHandler(node, makeContext(setOutput), { left: 1, right: 2 });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('greater_than — true when left > right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: '>' } };
    await runHandler(node, makeContext(setOutput), { left: 10, right: 5 });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('less_than — true when left < right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: '<' } };
    await runHandler(node, makeContext(setOutput), { left: 3, right: 7 });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('greater_than_or_equal — true when left === right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: '>=' } };
    await runHandler(node, makeContext(setOutput), { left: 5, right: 5 });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('less_than_or_equal — false when left > right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: '<=' } };
    await runHandler(node, makeContext(setOutput), { left: 10, right: 5 });
    expect(setOutput).toHaveBeenCalledWith('result', false);
  });

  it('contains — true when left includes right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'contains' } };
    await runHandler(node, makeContext(setOutput), { left: 'hello world', right: 'world' });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('starts_with — true when left starts with right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'starts_with' } };
    await runHandler(node, makeContext(setOutput), { left: 'hello world', right: 'hello' });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('ends_with — true when left ends with right', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'ends_with' } };
    await runHandler(node, makeContext(setOutput), { left: 'hello world', right: 'world' });
    expect(setOutput).toHaveBeenCalledWith('result', true);
  });

  it('defaults to equals when operator is unrecognized', async () => {
    const setOutput = vi.fn();
    const node = { id: 'c1', type: 'compare' as NodeType, config: { operator: 'unknown_op' } };
    await runHandler(node, makeContext(setOutput), { left: 'a', right: 'b' });
    expect(setOutput).toHaveBeenCalledWith('result', false);
  });
});

// ---------------------------------------------------------------------------
// and / or / not handlers — direct unit tests
// ---------------------------------------------------------------------------

describe('andHandler — direct', () => {
  async function run(a: unknown, b: unknown) {
    const setOutput = vi.fn();
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput,
    } as unknown as ExecutionContext;
    const node = { id: 'a1', type: 'and' as NodeType };
    const gen = andHandler(node, context, { a, b });
    for await (const _ of gen) {
    }
    return setOutput.mock.calls[0]?.[1];
  }

  it('true AND true = true', async () => {
    expect(await run(true, true)).toBe(true);
  });
  it('true AND false = false', async () => {
    expect(await run(true, false)).toBe(false);
  });
  it('false AND true = false', async () => {
    expect(await run(false, true)).toBe(false);
  });
  it('false AND false = false', async () => {
    expect(await run(false, false)).toBe(false);
  });
  it('coerces truthy values', async () => {
    expect(await run(1, 'hello')).toBe(true);
  });
});

describe('orHandler — direct', () => {
  async function run(a: unknown, b: unknown) {
    const setOutput = vi.fn();
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput,
    } as unknown as ExecutionContext;
    const node = { id: 'o1', type: 'or' as NodeType };
    const gen = orHandler(node, context, { a, b });
    for await (const _ of gen) {
    }
    return setOutput.mock.calls[0]?.[1];
  }

  it('true OR true = true', async () => {
    expect(await run(true, true)).toBe(true);
  });
  it('true OR false = true', async () => {
    expect(await run(true, false)).toBe(true);
  });
  it('false OR true = true', async () => {
    expect(await run(false, true)).toBe(true);
  });
  it('false OR false = false', async () => {
    expect(await run(false, false)).toBe(false);
  });
});

describe('notHandler — direct', () => {
  async function run(value: unknown) {
    const setOutput = vi.fn();
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput,
    } as unknown as ExecutionContext;
    const node = { id: 'n1', type: 'not' as NodeType };
    const gen = notHandler(node, context, { value });
    for await (const _ of gen) {
    }
    return setOutput.mock.calls[0]?.[1];
  }

  it('NOT true = false', async () => {
    expect(await run(true)).toBe(false);
  });
  it('NOT false = true', async () => {
    expect(await run(false)).toBe(true);
  });
  it('NOT truthy = false', async () => {
    expect(await run(1)).toBe(false);
  });
  it('NOT falsy = true', async () => {
    expect(await run(0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// if handler — direct unit tests
// ---------------------------------------------------------------------------

describe('ifHandler — direct', () => {
  it('executes true subgraph when condition is truthy', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = { id: 'if1', type: 'if' as NodeType };
    const gen = ifHandler(node, context, { condition: true }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('true');
  });

  it('executes false subgraph when condition is falsy', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = { id: 'if1', type: 'if' as NodeType };
    const gen = ifHandler(node, context, { condition: false }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('false');
  });

  it('does nothing when executeSubgraph is undefined', async () => {
    const gen = ifHandler(
      { id: 'if1', type: 'if' as NodeType },
      {
        taskId: 't1',
        signal: new AbortController().signal,
        page: mockPage(),
        getCustomHandler: () => undefined,
        setOutput: vi.fn(),
      } as unknown as ExecutionContext,
      { condition: true },
      undefined,
    );
    for await (const _ of gen) {
    }
  });
});

// ---------------------------------------------------------------------------
// switch handler — direct unit tests
// ---------------------------------------------------------------------------

describe('switchHandler — direct', () => {
  it('executes matching case subgraph', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = {
      id: 'sw1',
      type: 'switch' as NodeType,
      config: {
        cases: [
          { label: 'Admin', value: 'admin' },
          { label: 'User', value: 'user' },
        ],
      },
    };
    const gen = switchHandler(node, context, { value: 'user' }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('case_1');
  });

  it('executes default subgraph when no case matches', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = {
      id: 'sw1',
      type: 'switch' as NodeType,
      config: { cases: [{ label: 'Admin', value: 'admin' }] },
    };
    const gen = switchHandler(node, context, { value: 'guest' }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('default');
  });

  it('handles empty cases array', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = { id: 'sw1', type: 'switch' as NodeType, config: { cases: [] } };
    const gen = switchHandler(node, context, { value: 'x' }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('default');
  });

  it('does nothing when executeSubgraph is undefined', async () => {
    const gen = switchHandler(
      { id: 'sw1', type: 'switch' as NodeType, config: { cases: [{ label: 'A', value: 'a' }] } },
      {
        taskId: 't1',
        signal: new AbortController().signal,
        page: mockPage(),
        getCustomHandler: () => undefined,
        setOutput: vi.fn(),
      } as unknown as ExecutionContext,
      { value: 'a' },
      undefined,
    );
    for await (const _ of gen) {
    }
  });

  it('matches case by string value', async () => {
    const executeSubgraph = vi.fn().mockReturnValue((async function* () {})());
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = {
      id: 'sw1',
      type: 'switch' as NodeType,
      config: { cases: [{ label: 'Num', value: '42' }] },
    };
    const gen = switchHandler(node, context, { value: '42' }, executeSubgraph);
    for await (const _ of gen) {
    }
    expect(executeSubgraph).toHaveBeenCalledWith('case_0');
  });
});

// ---------------------------------------------------------------------------
// break / continue handlers — direct unit tests
// ---------------------------------------------------------------------------

describe('breakHandler — direct', () => {
  it("sets controlSignal.value to 'break'", async () => {
    const controlSignal = { value: undefined as 'break' | 'continue' | undefined };
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
      controlSignal,
    } as unknown as ExecutionContext;
    const node = { id: 'b1', type: 'break' as NodeType };
    const gen = breakHandler(node, context, {});
    for await (const _ of gen) {
    }
    expect(controlSignal.value).toBe('break');
  });

  it('does nothing when controlSignal is undefined', async () => {
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;
    const node = { id: 'b1', type: 'break' as NodeType };
    const gen = breakHandler(node, context, {});
    for await (const _ of gen) {
    }
  });
});

describe('continueHandler — direct', () => {
  it("sets controlSignal.value to 'continue'", async () => {
    const controlSignal = { value: undefined as 'break' | 'continue' | undefined };
    const context = {
      taskId: 't1',
      signal: new AbortController().signal,
      page: mockPage(),
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
      controlSignal,
    } as unknown as ExecutionContext;
    const node = { id: 'c1', type: 'continue' as NodeType };
    const gen = continueHandler(node, context, {});
    for await (const _ of gen) {
    }
    expect(controlSignal.value).toBe('continue');
  });
});

// ---------------------------------------------------------------------------
// Integration tests — compare + and + not + output chain
// ---------------------------------------------------------------------------

async function createStore(id = 'test'): Promise<GlobalStateStore> {
  const store = new GlobalStateStore(id);
  await store.initialize();
  return store;
}

describe('WorkflowInterpreter — compare', () => {
  it('compare node outputs result via data pin to output', async () => {
    const page = mockPage();
    const loc = mockLocator();
    vi.mocked(loc.textContent).mockResolvedValue('25');
    vi.mocked(page.locator).mockReturnValue(loc);
    const store = await createStore('int-cmp1');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('cfg_age', 'state', { operation: 'set', key: 'age', value: 25 }),
            node('cfg_18', 'state', { operation: 'set', key: '_18', value: 18 }),
            node('cmp', 'compare', { operator: '>=' }),
            node('out', 'output', { propertyPath: 'isAdult' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'cfg_age', 'flow'),
            edge('e2', 'cfg_age', 'flow', 'cfg_18', 'flow'),
            edge('e3', 'cfg_18', 'flow', 'cmp', 'flow'),
            edge('e4', 'cfg_age', 'value', 'cmp', 'left'),
            edge('e5', 'cfg_18', 'value', 'cmp', 'right'),
            edge('e6', 'cmp', 'flow', 'out', 'flow'),
            edge('e7', 'cmp', 'result', 'out', 'value'),
            edge('e8', 'out', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    const partialData = events.filter((e) => e.type === 'partial_data') as Extract<
      WorkflowEvent,
      { type: 'partial_data' }
    >[];
    expect(partialData).toHaveLength(1);
    expect(partialData[0].path).toBe('isAdult');
    expect(partialData[0].value).toBe(true);
  });

  it('compare with not_equals returns true', async () => {
    const store = await createStore('int-cmp2');
    const intr = new WorkflowInterpreter(
      makeOpts({
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('a', 'state', { operation: 'set', key: 'a', value: 'cat' }),
            node('b', 'state', { operation: 'set', key: 'b', value: 'dog' }),
            node('cmp', 'compare', { operator: '!=' }),
            node('out', 'output', { propertyPath: 'different' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'a', 'flow'),
            edge('e2', 'a', 'flow', 'b', 'flow'),
            edge('e3', 'b', 'flow', 'cmp', 'flow'),
            edge('e4', 'a', 'value', 'cmp', 'left'),
            edge('e5', 'b', 'value', 'cmp', 'right'),
            edge('e6', 'cmp', 'flow', 'out', 'flow'),
            edge('e7', 'cmp', 'result', 'out', 'value'),
            edge('e8', 'out', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
  });
});

describe('WorkflowInterpreter — and', () => {
  it('and node combines two boolean inputs from state', async () => {
    const store = await createStore('int-and');
    const intr = new WorkflowInterpreter(
      makeOpts({
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('a', 'state', { operation: 'set', key: 'a', value: true }),
            node('b', 'state', { operation: 'set', key: 'b', value: false }),
            node('and', 'and'),
            node('out', 'output', { propertyPath: 'result' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'a', 'flow'),
            edge('e2', 'a', 'flow', 'b', 'flow'),
            edge('e3', 'b', 'flow', 'and', 'flow'),
            edge('e4', 'a', 'value', 'and', 'a'),
            edge('e5', 'b', 'value', 'and', 'b'),
            edge('e6', 'and', 'flow', 'out', 'flow'),
            edge('e7', 'and', 'result', 'out', 'value'),
            edge('e8', 'out', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    const pd = events.filter((e) => e.type === 'partial_data')[0] as any;
    expect(pd.value).toBe(false);
  });
});

describe('WorkflowInterpreter — if conditional branching', () => {
  it('follows true branch when condition is true', async () => {
    const page = mockPage();
    const store = await createStore('int-if1');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('src', 'state', { operation: 'set', key: 'cond', value: true }),
            node('if', 'if'),
            node('nav_true', 'navigate', { url: 'https://example.com/true' }),
            node('nav_false', 'navigate', { url: 'https://example.com/false' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'src', 'flow'),
            edge('e2', 'src', 'flow', 'if', 'flow'),
            edge('e3', 'src', 'value', 'if', 'condition'),
            edge('e4', 'if', 'true', 'nav_true', 'flow'),
            edge('e5', 'if', 'false', 'nav_false', 'flow'),
            edge('e6', 'nav_true', 'flow', 'e', 'flow'),
            edge('e7', 'nav_false', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    // Only the true branch navigated
    expect(page.goto).toHaveBeenCalledWith('https://example.com/true', undefined);
    expect(page.goto).not.toHaveBeenCalledWith('https://example.com/false', undefined);
  });

  it('follows false branch when condition is false', async () => {
    const page = mockPage();
    const store = await createStore('int-if2');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('src', 'state', { operation: 'set', key: 'cond', value: false }),
            node('if', 'if'),
            node('nav_true', 'navigate', { url: 'https://example.com/true' }),
            node('nav_false', 'navigate', { url: 'https://example.com/false' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'src', 'flow'),
            edge('e2', 'src', 'flow', 'if', 'flow'),
            edge('e3', 'src', 'value', 'if', 'condition'),
            edge('e4', 'if', 'true', 'nav_true', 'flow'),
            edge('e5', 'if', 'false', 'nav_false', 'flow'),
            edge('e6', 'nav_true', 'flow', 'e', 'flow'),
            edge('e7', 'nav_false', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/false', undefined);
    expect(page.goto).not.toHaveBeenCalledWith('https://example.com/true', undefined);
  });
});

describe('WorkflowInterpreter — switch multi-case branching', () => {
  it('routes to matching case', async () => {
    const page = mockPage();
    const store = await createStore('int-sw1');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('src', 'state', { operation: 'set', key: 'role', value: 'user' }),
            node('sw', 'switch', {
              cases: [
                { label: 'Admin', value: 'admin' },
                { label: 'User', value: 'user' },
              ],
            }),
            node('nav_adm', 'navigate', { url: 'https://example.com/admin' }),
            node('nav_usr', 'navigate', { url: 'https://example.com/user' }),
            node('nav_def', 'navigate', { url: 'https://example.com/default' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'src', 'flow'),
            edge('e2', 'src', 'flow', 'sw', 'flow'),
            edge('e3', 'src', 'value', 'sw', 'value'),
            edge('e4', 'sw', 'case_0', 'nav_adm', 'flow'),
            edge('e5', 'sw', 'case_1', 'nav_usr', 'flow'),
            edge('e6', 'sw', 'default', 'nav_def', 'flow'),
            edge('e7', 'nav_usr', 'flow', 'e', 'flow'),
            edge('e8', 'nav_adm', 'flow', 'e', 'flow'),
            edge('e9', 'nav_def', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/user', undefined);
    expect(page.goto).not.toHaveBeenCalledWith('https://example.com/admin', undefined);
    expect(page.goto).not.toHaveBeenCalledWith('https://example.com/default', undefined);
  });

  it('falls to default when no case matches', async () => {
    const page = mockPage();
    const store = await createStore('int-sw2');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('src', 'state', { operation: 'set', key: 'role', value: 'guest' }),
            node('sw', 'switch', { cases: [{ label: 'Admin', value: 'admin' }] }),
            node('nav_adm', 'navigate', { url: 'https://example.com/admin' }),
            node('nav_def', 'navigate', { url: 'https://example.com/default' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'src', 'flow'),
            edge('e2', 'src', 'flow', 'sw', 'flow'),
            edge('e3', 'src', 'value', 'sw', 'value'),
            edge('e4', 'sw', 'case_0', 'nav_adm', 'flow'),
            edge('e5', 'sw', 'default', 'nav_def', 'flow'),
            edge('e6', 'nav_adm', 'flow', 'e', 'flow'),
            edge('e7', 'nav_def', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(page.goto).toHaveBeenCalledWith('https://example.com/default', undefined);
    expect(page.goto).not.toHaveBeenCalledWith('https://example.com/admin', undefined);
  });
});

describe('WorkflowInterpreter — loop with break and continue', () => {
  it('break stops loop execution', async () => {
    const page = mockPage();
    const item1 = mockLocator();
    const item2 = mockLocator();
    const item3 = mockLocator();
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue([item1, item2, item3]);
    vi.mocked(page.locator).mockReturnValue(parentLoc);
    vi.mocked(item1.textContent).mockResolvedValue('alpha');
    vi.mocked(item2.textContent).mockResolvedValue('beta');
    vi.mocked(item3.textContent).mockResolvedValue('gamma');

    // Build a workflow: start → select all → loop
    // Loop body: extract text → compare(text === "beta") → if → true branch: break
    // The compare result feeds into if condition.
    // If break, loop stops. Otherwise, save via output.
    // We set up src_trigger as a state node with value "beta" for comparison.

    const store = await createStore('int-break');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('loop', 'loop', {}),
            node('ext', 'extract', { property: 'text' }),
            node('src_break_val', 'state', { operation: 'set', key: '_breakOn', value: 'beta' }),
            node('cmp_break', 'compare', { operator: '==' }),
            node('if_break', 'if'),
            node('brk', 'break'),
            node('out', 'output', { propertyPath: 'items' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'loop', 'flow'),
            edge('e3', 'sel', 'element', 'loop', 'items'),
            // Loop body
            edge('e4', 'loop', 'body', 'ext', 'flow'),
            edge('e5', 'loop', 'item', 'ext', 'element'),
            edge('e6', 'ext', 'flow', 'src_break_val', 'flow'),
            edge('e7', 'ext', 'value', 'cmp_break', 'left'),
            edge('e8', 'src_break_val', 'value', 'cmp_break', 'right'),
            edge('e9', 'src_break_val', 'flow', 'cmp_break', 'flow'),
            // compare → if
            edge('e10', 'cmp_break', 'flow', 'if_break', 'flow'),
            edge('e11', 'cmp_break', 'result', 'if_break', 'condition'),
            // if true → break
            edge('e12', 'if_break', 'true', 'brk', 'flow'),
            // if false → output
            edge('e13', 'if_break', 'false', 'out', 'flow'),
            edge('e14', 'ext', 'value', 'out', 'value'),
            // Loop flow and convergence
            edge('e15', 'loop', 'index', 'out', 'index'),
            edge('e16', 'loop', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    // Item1 "alpha" processed, Item2 "beta" triggers break → item3 never processed
    expect(item1.textContent).toHaveBeenCalled();
    expect(item2.textContent).toHaveBeenCalled();
    expect(item3.textContent).not.toHaveBeenCalled();
  });

  it('continue skips to next iteration', async () => {
    const page = mockPage();
    const item1 = mockLocator();
    const item2 = mockLocator();
    const item3 = mockLocator();
    const parentLoc = mockLocator();
    vi.mocked(parentLoc.all).mockResolvedValue([item1, item2, item3]);
    vi.mocked(page.locator).mockReturnValue(parentLoc);
    vi.mocked(item1.textContent).mockResolvedValue('alpha');
    vi.mocked(item2.textContent).mockResolvedValue('skip');
    vi.mocked(item3.textContent).mockResolvedValue('gamma');

    const store = await createStore('int-cont');

    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        stateStore: store,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('sel', 'select', { mode: 'all', selector: '.item' }),
            node('loop', 'loop', {}),
            node('ext', 'extract', { property: 'text' }),
            node('src_skip_val', 'state', { operation: 'set', key: '_skipVal', value: 'skip' }),
            node('cmp_skip', 'compare', { operator: '==' }),
            node('if_skip', 'if'),
            node('cont', 'continue'),
            node('out', 'output', { propertyPath: 'items' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'sel', 'flow'),
            edge('e2', 'sel', 'flow', 'loop', 'flow'),
            edge('e3', 'sel', 'element', 'loop', 'items'),
            // Loop body
            edge('e4', 'loop', 'body', 'ext', 'flow'),
            edge('e5', 'loop', 'item', 'ext', 'element'),
            edge('e6', 'ext', 'flow', 'src_skip_val', 'flow'),
            edge('e7', 'ext', 'value', 'cmp_skip', 'left'),
            edge('e8', 'src_skip_val', 'value', 'cmp_skip', 'right'),
            edge('e9', 'src_skip_val', 'flow', 'cmp_skip', 'flow'),
            // compare → if
            edge('e10', 'cmp_skip', 'flow', 'if_skip', 'flow'),
            edge('e11', 'cmp_skip', 'result', 'if_skip', 'condition'),
            // if true → continue
            edge('e12', 'if_skip', 'true', 'cont', 'flow'),
            // if false → output
            edge('e13', 'if_skip', 'false', 'out', 'flow'),
            edge('e14', 'ext', 'value', 'out', 'value'),
            edge('e15', 'loop', 'index', 'out', 'index'),
            // Loop flow
            edge('e16', 'loop', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    // Item1 processed, Item2 skipped (continue), Item3 processed
    expect(item1.textContent).toHaveBeenCalled();
    expect(item2.textContent).toHaveBeenCalled();
    expect(item3.textContent).toHaveBeenCalled();
  });
});
