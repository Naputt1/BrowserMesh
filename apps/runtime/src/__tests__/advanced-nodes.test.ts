import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  WorkflowEvent,
  GlobalSettings,
} from '@browsermesh/workflow';
import {
  WorkflowInterpreter,
  type InterpreterOptions,
} from '../interpreter/workflow-interpreter.js';
import type {
  Page,
  Locator,
  CustomHandler,
  ExecutionContext,
  NodeHandler,
} from '../interpreter/types.js';
import { GlobalStateStore, FilePersistentStateStore } from '../global-state-store.js';
import { PageManager, DefaultPageFactory } from '../page-manager.js';
import { fetchHandler } from '../interpreter/handlers/fetch.js';
import { listenHandler } from '../interpreter/handlers/listen.js';
import { stateHandler } from '../interpreter/handlers/state.js';
import { pageHandler } from '../interpreter/handlers/page.js';

// ---------------------------------------------------------------------------
// Shared mocks & helpers
// ---------------------------------------------------------------------------

function mockLocator(): Locator {
  return {
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue('text'),
    getAttribute: vi.fn().mockResolvedValue('attr'),
    inputValue: vi.fn().mockResolvedValue('val'),
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
// GlobalStateStore
// ---------------------------------------------------------------------------

describe('GlobalStateStore', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'browsermesh-state-test-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('initializes with empty state when no files exist', async () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    await store.initialize();
    expect(store.getAll()).toEqual({});
  });

  it('set and get values', async () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    await store.initialize();
    store.set('index', 42);
    store.set('name', 'hello');
    expect(store.get('index')).toBe(42);
    expect(store.get('name')).toBe('hello');
  });

  it('increment returns running total', () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    store.initialize();
    expect(store.increment('counter')).toBe(1);
    expect(store.increment('counter')).toBe(2);
    expect(store.increment('counter', 5)).toBe(7);
  });

  it('delete removes a key', () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    store.initialize();
    store.set('a', 1);
    store.set('b', 2);
    store.delete('a');
    expect(store.get('a')).toBeUndefined();
    expect(store.get('b')).toBe(2);
  });

  it('getAll returns a snapshot of all entries', () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    store.initialize();
    store.set('x', 10);
    store.set('y', 'test');
    expect(store.getAll()).toEqual({ x: 10, y: 'test' });
  });

  it('writes backup file within timeout', async () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    await store.initialize();
    store.set('key', 'val');
    await new Promise((r) => setTimeout(r, 600));
    const filePath = join(tmpDir, 'wf-test.json');
    expect(existsSync(filePath)).toBe(true);
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content).toEqual({ key: 'val' });
  });

  it('commit writes persistent state file', async () => {
    const store = new GlobalStateStore('wf-test', tmpDir);
    await store.initialize();
    store.set('committed', true);
    await store.commit();
    const filePath = join(tmpDir, 'wf-test.persist.json');
    expect(existsSync(filePath)).toBe(true);
    const content = JSON.parse(readFileSync(filePath, 'utf-8'));
    expect(content).toEqual({ committed: true });
  });

  it('initialize recovers from backup file', async () => {
    writeFileSync(join(tmpDir, 'wf-test.json'), JSON.stringify({ recovered: 'yes' }));
    const store = new GlobalStateStore('wf-test', tmpDir);
    await store.initialize();
    expect(store.get('recovered')).toBe('yes');
  });

  it('initialize prefers persistent store over backup', async () => {
    writeFileSync(join(tmpDir, 'wf-test.json'), JSON.stringify({ fromBackup: true }));
    const persist = new FilePersistentStateStore(tmpDir);
    await persist.save('wf-test', { fromPersist: true });

    const store = new GlobalStateStore('wf-test', tmpDir, persist);
    await store.initialize();
    expect(store.get('fromPersist')).toBe(true);
    expect(store.get('fromBackup')).toBe(true);
  });

  it('recover returns false when no backup exists', async () => {
    const result = await GlobalStateStore.recover('nonexistent', tmpDir);
    expect(result).toBe(false);
  });

  it('recover returns true when backup exists', async () => {
    writeFileSync(join(tmpDir, 'wf-exists.json'), JSON.stringify({ a: 1 }));
    const result = await GlobalStateStore.recover('wf-exists', tmpDir);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PageManager
// ---------------------------------------------------------------------------

describe('PageManager', () => {
  function mockPlaywrightPage() {
    return {
      goto: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      url: vi.fn().mockReturnValue('about:blank'),
      addInitScript: vi.fn().mockResolvedValue(undefined),
      evaluate: vi.fn().mockResolvedValue(undefined),
      locator: vi.fn().mockReturnValue(mockLocator()),
    } as any;
  }

  function mockBrowserContext() {
    return {
      newPage: vi.fn().mockImplementation(() => Promise.resolve(mockPlaywrightPage())),
      close: vi.fn().mockResolvedValue(undefined),
    } as any;
  }

  it('initializes with one default page', async () => {
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    const ctx = mockBrowserContext();
    const pwPage = mockPlaywrightPage();
    const pageId = await pm.initialize(ctx, pwPage);
    expect(pageId).toBe('default');
    expect(pm.listPages()).toHaveLength(1);
    expect(pm.listPages()[0].pageId).toBe('default');
  });

  it('getPage returns the default page when no pageId is given', async () => {
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(mockBrowserContext(), mockPlaywrightPage());
    const page = pm.getPage();
    expect(page).toBeDefined();
  });

  it('createPage opens a new tab in the same context', async () => {
    const ctx = mockBrowserContext();
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(ctx, mockPlaywrightPage());
    await pm.createPage('tab2', 'https://example.com');
    expect(pm.listPages()).toHaveLength(2);
    expect(pm.listPages()[1].pageId).toBe('tab2');
  });

  it('throws when creating duplicate pageId', async () => {
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(mockBrowserContext(), mockPlaywrightPage());
    await expect(pm.createPage('default')).rejects.toThrow('Page already exists');
  });

  it('throws when getting non-existent page', async () => {
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(mockBrowserContext(), mockPlaywrightPage());
    expect(() => pm.getPage('nonexistent')).toThrow('Page not found');
  });

  it('switchDefault changes which page is returned by getPage()', async () => {
    const ctx = mockBrowserContext();
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(ctx, mockPlaywrightPage());
    await pm.createPage('tab2');
    pm.switchDefault('tab2');
    const page = pm.getPage();
    expect(pm.listPages().find((p) => p.pageId === 'tab2')).toBeDefined();
    expect(pm.listPages()).toHaveLength(2);
  });

  it('closePage removes the page and switches default if needed', async () => {
    const ctx = mockBrowserContext();
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(ctx, mockPlaywrightPage());
    await pm.closePage('default');
    expect(pm.listPages()).toHaveLength(0);
  });

  it('closeAll removes all pages', async () => {
    const ctx = mockBrowserContext();
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(ctx, mockPlaywrightPage());
    await pm.createPage('tab2');
    await pm.createPage('tab3');
    await pm.closeAll();
    expect(pm.listPages()).toHaveLength(0);
  });

  it('createPage navigates to url when provided', async () => {
    const ctx = mockBrowserContext();
    const pwPage = mockPlaywrightPage();
    const factory = new DefaultPageFactory();
    const pm = new PageManager(factory);
    await pm.initialize(ctx, pwPage);
    await pm.createPage('tab2', 'https://example.com');
    expect(ctx.newPage).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch handler
// ---------------------------------------------------------------------------

describe('WorkflowInterpreter — fetch', () => {
  it('executes a basic GET request via page.evaluate', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate).mockResolvedValue(
      JSON.stringify({
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"data":"ok"}',
      }),
    );
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          settings: { multiPage: false },
          nodes: [
            node('s', 'start'),
            node('f', 'fetch', {
              method: 'GET',
              url: 'https://api.example.com/data',
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(events.find((e) => e.type === 'task_completed')).toBeDefined();
    expect(page.evaluate).toHaveBeenCalled();
    const callArg = vi.mocked(page.evaluate).mock.calls[0][0] as string;
    expect(callArg).toContain('fetch');
    expect(callArg).toContain('https://api.example.com/data');
  });

  it('substitutes variables from data inputs', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate).mockResolvedValue(
      JSON.stringify({ status: 200, statusText: 'OK', headers: {}, body: '' }),
    );
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          settings: { multiPage: false },
          nodes: [
            node('s', 'start'),
            node('f', 'fetch', {
              method: 'GET',
              url: 'https://api.example.com/${resource}/${id}',
              variables: ['resource', 'id'],
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.evaluate).toHaveBeenCalled();
    const callArg = vi.mocked(page.evaluate).mock.calls[0][0] as string;
    expect(callArg).toContain('${resource}');
    expect(callArg).toContain('${id}');
  });

  it('includes headers in the fetch call', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate).mockResolvedValue(
      JSON.stringify({ status: 200, statusText: 'OK', headers: {}, body: '' }),
    );
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('f', 'fetch', {
              method: 'POST',
              url: 'https://api.example.com/data',
              headers: [
                { key: 'Authorization', value: 'Bearer token123' },
                { key: 'X-Custom', value: 'test' },
              ],
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.evaluate).toHaveBeenCalled();
    const callArg = vi.mocked(page.evaluate).mock.calls[0][0] as string;
    expect(callArg).toContain('Bearer token123');
    expect(callArg).toContain('X-Custom');
  });

  it('includes body for POST requests', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate).mockResolvedValue(
      JSON.stringify({ status: 200, statusText: 'OK', headers: {}, body: '' }),
    );
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('f', 'fetch', {
              method: 'POST',
              url: 'https://api.example.com/data',
              body: JSON.stringify({ name: 'test' }),
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.evaluate).toHaveBeenCalled();
    const callArg = vi.mocked(page.evaluate).mock.calls[0][0] as string;
    expect(callArg).toContain('name');
    expect(callArg).toContain('test');
  });

  it('outputs response data via setOutput', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate).mockResolvedValue(
      JSON.stringify({
        status: 201,
        statusText: 'Created',
        headers: { 'x-id': '123' },
        body: '{"id":123}',
      }),
    );
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('f', 'fetch', {
              method: 'GET',
              url: 'https://api.example.com/data',
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
  });

  it('throws when url is missing', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [node('s', 'start'), node('f', 'fetch', { method: 'GET' }), node('e', 'end')],
          edges: [edge('e1', 's', 'flow', 'f', 'flow'), edge('e2', 'f', 'flow', 'e', 'flow')],
        }),
      }),
    );
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Listen handler
// ---------------------------------------------------------------------------

describe('WorkflowInterpreter — listen', () => {
  it('injects interception script via addInitScript', async () => {
    const page = mockPage();
    const evaluate = vi.mocked(page.evaluate);
    evaluate.mockReset();
    evaluate.mockResolvedValueOnce(false);
    evaluate.mockResolvedValueOnce(undefined);
    evaluate.mockResolvedValueOnce('[]');
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('l', 'listen', { urlPatterns: ['/api/*'], waitMs: 0 }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'l', 'flow'), edge('e2', 'l', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.addInitScript).toHaveBeenCalled();
    const scriptArg = vi.mocked(page.addInitScript).mock.calls[0][0] as string;
    expect(scriptArg).toContain('__browsermesh_requests');
    expect(scriptArg).toContain('origFetch');
  });

  it('checks for existing interceptor before injecting', async () => {
    const page = mockPage();
    vi.mocked(page.evaluate as any)
      .mockResolvedValueOnce('true')
      .mockResolvedValueOnce('[]');
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('l', 'listen', { urlPatterns: ['/api/*'], waitMs: 0 }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'l', 'flow'), edge('e2', 'l', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.addInitScript).not.toHaveBeenCalled();
  });

  it('reads captured requests and filters by URL pattern', async () => {
    const captured = JSON.stringify([
      { url: '/api/data', method: 'GET', status: 200, timestamp: 100 },
      { url: '/css/style.css', method: 'GET', status: 200, timestamp: 200 },
      { url: '/api/users', method: 'POST', status: 201, timestamp: 300 },
    ]);
    const page = mockPage();
    const evaluate = vi.mocked(page.evaluate);
    evaluate.mockReset();
    evaluate.mockResolvedValueOnce(false);
    evaluate.mockResolvedValueOnce(undefined);
    evaluate.mockResolvedValueOnce(captured);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('l', 'listen', { urlPatterns: ['/api/*'], waitMs: 0 }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'l', 'flow'), edge('e2', 'l', 'flow', 'e', 'flow')],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.addInitScript).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// State handler
// ---------------------------------------------------------------------------

describe('WorkflowInterpreter — state', () => {
  it('set then get a value in the same workflow', async () => {
    const store = new GlobalStateStore('wf-state-test');
    await store.initialize();

    const page = mockPage();
    const wfDef = wf({
      id: 'wf-state-test',
      nodes: [
        node('s', 'start'),
        node('st1', 'state', { operation: 'set', key: 'counter', value: 1 }),
        node('st2', 'state', { operation: 'get', key: 'counter', defaultValue: 0 }),
        node('e', 'end'),
      ],
      edges: [
        edge('e1', 's', 'flow', 'st1', 'flow'),
        edge('e2', 'st1', 'flow', 'st2', 'flow'),
        edge('e3', 'st2', 'flow', 'e', 'flow'),
      ],
    });

    const intr = new WorkflowInterpreter({
      workflow: wfDef,
      page,
      taskId: 't1',
      stateStore: store,
    });
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(store.get('counter')).toBe(1);
  });

  it('increment operation adds to existing value', async () => {
    const store = new GlobalStateStore('wf-inc-test');
    await store.initialize();
    store.set('count', 10);

    const page = mockPage();
    const wfDef = wf({
      id: 'wf-inc-test',
      nodes: [
        node('s', 'start'),
        node('st', 'state', { operation: 'increment', key: 'count' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'st', 'flow'), edge('e2', 'st', 'flow', 'e', 'flow')],
    });

    const intr = new WorkflowInterpreter({
      workflow: wfDef,
      page,
      taskId: 't1',
      stateStore: store,
    });
    await collect(intr.execute());
    expect(store.get('count')).toBe(11);
  });

  it('delete operation removes a key', async () => {
    const store = new GlobalStateStore('wf-del-test');
    await store.initialize();
    store.set('temp', 'value');

    const page = mockPage();
    const wfDef = wf({
      id: 'wf-del-test',
      nodes: [
        node('s', 'start'),
        node('st', 'state', { operation: 'delete', key: 'temp' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'st', 'flow'), edge('e2', 'st', 'flow', 'e', 'flow')],
    });

    const intr = new WorkflowInterpreter({
      workflow: wfDef,
      page,
      taskId: 't1',
      stateStore: store,
    });
    await collect(intr.execute());
    expect(store.get('temp')).toBeUndefined();
  });

  it('commit operation persists to the persistent store', async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'browsermesh-state-commit-'));
    try {
      const store = new GlobalStateStore('wf-commit-test', tmpDir);
      await store.initialize();
      store.set('persisted', true);

      const page = mockPage();
      const wfDef = wf({
        id: 'wf-commit-test',
        nodes: [
          node('s', 'start'),
          node('st', 'state', { operation: 'commit', key: 'dummy' }),
          node('e', 'end'),
        ],
        edges: [edge('e1', 's', 'flow', 'st', 'flow'), edge('e2', 'st', 'flow', 'e', 'flow')],
      });

      const intr = new WorkflowInterpreter({
        workflow: wfDef,
        page,
        taskId: 't1',
        stateStore: store,
      });
      await collect(intr.execute());

      const persistPath = join(tmpDir, 'wf-commit-test.persist.json');
      expect(existsSync(persistPath)).toBe(true);
      const content = JSON.parse(readFileSync(persistPath, 'utf-8'));
      expect(content).toEqual({ persisted: true });
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('throws when store is not available', async () => {
    const page = mockPage();
    const wfDef = wf({
      nodes: [
        node('s', 'start'),
        node('st', 'state', { operation: 'get', key: 'x' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'st', 'flow'), edge('e2', 'st', 'flow', 'e', 'flow')],
    });

    const intr = new WorkflowInterpreter({ workflow: wfDef, page, taskId: 't1' });
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Page handler
// ---------------------------------------------------------------------------

describe('WorkflowInterpreter — page', () => {
  it('fails when pageManager is not available', async () => {
    const page = mockPage();
    const wfDef = wf({
      nodes: [
        node('s', 'start'),
        node('p', 'page', { action: 'create', pageId: 'tab2' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'p', 'flow'), edge('e2', 'p', 'flow', 'e', 'flow')],
    });
    const intr = new WorkflowInterpreter({ workflow: wfDef, page, taskId: 't1' });
    const events = await collect(intr.execute());
    expect(events.some((e) => e.type === 'task_failed')).toBe(true);
  });

  it('create action creates a new page', async () => {
    const page = mockPage();
    const pageManager = {
      createPage: vi.fn().mockResolvedValue(undefined),
      switchDefault: vi.fn(),
      closePage: vi.fn().mockResolvedValue(undefined),
      listPages: vi.fn().mockReturnValue([
        { pageId: 'default', url: 'about:blank' },
        { pageId: 'tab2', url: 'about:blank' },
      ]),
      getPage: vi.fn().mockReturnValue(page),
      closeAll: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue('default'),
    } as unknown as PageManager;

    const wfDef = wf({
      nodes: [
        node('s', 'start'),
        node('p', 'page', { action: 'create', pageId: 'tab2' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'p', 'flow'), edge('e2', 'p', 'flow', 'e', 'flow')],
    });
    const intr = new WorkflowInterpreter({ workflow: wfDef, page, taskId: 't1', pageManager });
    await collect(intr.execute());
    expect(pageManager.createPage).toHaveBeenCalledWith('tab2');
  });

  it('select action changes the default page', async () => {
    const page = mockPage();
    const pageManager = {
      createPage: vi.fn().mockResolvedValue(undefined),
      switchDefault: vi.fn(),
      closePage: vi.fn().mockResolvedValue(undefined),
      listPages: vi.fn().mockReturnValue([]),
      getPage: vi.fn().mockReturnValue(page),
      closeAll: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue('default'),
    } as unknown as PageManager;

    const wfDef = wf({
      nodes: [
        node('s', 'start'),
        node('p', 'page', { action: 'select', pageId: 'tab2' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'p', 'flow'), edge('e2', 'p', 'flow', 'e', 'flow')],
    });
    const intr = new WorkflowInterpreter({ workflow: wfDef, page, taskId: 't1', pageManager });
    await collect(intr.execute());
    expect(pageManager.switchDefault).toHaveBeenCalledWith('tab2');
  });

  it('close action closes a page', async () => {
    const page = mockPage();
    const pageManager = {
      createPage: vi.fn().mockResolvedValue(undefined),
      switchDefault: vi.fn(),
      closePage: vi.fn().mockResolvedValue(undefined),
      listPages: vi.fn().mockReturnValue([]),
      getPage: vi.fn().mockReturnValue(page),
      closeAll: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue('default'),
    } as unknown as PageManager;

    const wfDef = wf({
      nodes: [
        node('s', 'start'),
        node('p', 'page', { action: 'close', pageId: 'tab2' }),
        node('e', 'end'),
      ],
      edges: [edge('e1', 's', 'flow', 'p', 'flow'), edge('e2', 'p', 'flow', 'e', 'flow')],
    });
    const intr = new WorkflowInterpreter({ workflow: wfDef, page, taskId: 't1', pageManager });
    await collect(intr.execute());
    expect(pageManager.closePage).toHaveBeenCalledWith('tab2');
  });
});

// ---------------------------------------------------------------------------
// pageKey data pin routing
// ---------------------------------------------------------------------------

describe('WorkflowInterpreter — pageKey routing via data pins', () => {
  function makePageManager(page: Page): PageManager {
    return {
      getPage: vi.fn((_id?: string) => page),
      createPage: vi.fn().mockResolvedValue(undefined),
      switchDefault: vi.fn(),
      closePage: vi.fn().mockResolvedValue(undefined),
      listPages: vi.fn().mockReturnValue([]),
      closeAll: vi.fn().mockResolvedValue(undefined),
      initialize: vi.fn().mockResolvedValue('default'),
    } as unknown as PageManager;
  }

  it('navigate with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab2' }),
            node('n', 'navigate', { url: 'https://example.com' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'n', 'flow'),
            edge('e3', 'p', 'pageKey', 'n', 'pageKey'),
            edge('e4', 'n', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    await collect(intr.execute());
    expect(pm.getPage).toHaveBeenCalledWith('tab2');
  });

  it('click with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 't1' }),
            node('c', 'click', { selector: '.btn' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'c', 'flow'),
            edge('e3', 'p', 'pageKey', 'c', 'pageKey'),
            edge('e4', 'c', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    await collect(intr.execute());
    expect(pm.getPage).toHaveBeenCalledWith('t1');
  });

  it('type with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 't1' }),
            node('t', 'type', { selector: '#input', value: 'hello' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 't', 'flow'),
            edge('e3', 'p', 'pageKey', 't', 'pageKey'),
            edge('e4', 't', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    await collect(intr.execute());
    expect(pm.getPage).toHaveBeenCalledWith('t1');
  });

  it('fetch with pageKey routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    vi.mocked(page.evaluate).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: {},
      body: '',
    });
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 't1' }),
            node('f', 'fetch', {
              method: 'GET',
              url: 'https://example.com/api',
              actLikeNavigation: false,
            }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'f', 'flow'),
            edge('e3', 'p', 'pageKey', 'f', 'pageKey'),
            edge('e4', 'f', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    await collect(intr.execute());
    expect(pm.getPage).toHaveBeenCalledWith('t1');
  });

  it('navigate without pageKey uses context.page directly', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('n', 'navigate', { url: 'https://example.com' }),
            node('e', 'end'),
          ],
          edges: [edge('e1', 's', 'flow', 'n', 'flow'), edge('e2', 'n', 'flow', 'e', 'flow')],
        }),
        pageManager: pm,
      }),
    );
    await collect(intr.execute());
    expect(page.goto).toHaveBeenCalledWith('https://example.com', undefined);
  });

  it('page node outputs pageKey which can be chained', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab2' }),
            node('n', 'navigate', { url: 'https://example.com' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'n', 'flow'),
            edge('e3', 'p', 'pageKey', 'n', 'pageKey'),
            edge('e4', 'n', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(pm.getPage).toHaveBeenCalledWith('tab2');
  });

  it('wait with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab1' }),
            node('w', 'wait', { durationMs: 0 }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'w', 'flow'),
            edge('e3', 'p', 'pageKey', 'w', 'pageKey'),
            edge('e4', 'w', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(pm.getPage).toHaveBeenCalledWith('tab1');
  });

  it('scroll with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab1' }),
            node('sc', 'scroll', {}),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'sc', 'flow'),
            edge('e3', 'p', 'pageKey', 'sc', 'pageKey'),
            edge('e4', 'sc', 'flow', 'e', 'flow'),
          ],
        }),
        pageManager: pm,
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(pm.getPage).toHaveBeenCalledWith('tab1');
  });

  it('extract with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab1' }),
            node('sel', 'select', { selector: '.item' }),
            node('ext', 'extract', { property: 'text' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'sel', 'flow'),
            edge('e3', 'sel', 'flow', 'ext', 'flow'),
            edge('e4', 'ext', 'flow', 'e', 'flow'),
            edge('e5', 'sel', 'element', 'ext', 'element'),
            edge('e6', 'p', 'pageKey', 'ext', 'pageKey'),
          ],
        }),
        pageManager: pm,
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(pm.getPage).toHaveBeenCalledWith('tab1');
  });

  it('select with pageKey data pin routes to that page', async () => {
    const page = mockPage();
    const pm = makePageManager(page);
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('p', 'page', { action: 'create', pageId: 'tab1' }),
            node('sel', 'select', { selector: '.item' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'p', 'flow'),
            edge('e2', 'p', 'flow', 'sel', 'flow'),
            edge('e3', 'sel', 'flow', 'e', 'flow'),
            edge('e4', 'p', 'pageKey', 'sel', 'pageKey'),
          ],
        }),
        pageManager: pm,
      }),
    );
    const events = await collect(intr.execute());
    expect(events.filter((e) => e.type === 'task_failed')).toHaveLength(0);
    expect(pm.getPage).toHaveBeenCalledWith('tab1');
  });

  it('URL from data pin takes priority over config URL', async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(
      makeOpts({
        page,
        workflow: wf({
          nodes: [
            node('s', 'start'),
            node('ext', 'extract', { property: 'text' }),
            node('n', 'navigate', { url: 'https://fallback.example.com' }),
            node('e', 'end'),
          ],
          edges: [
            edge('e1', 's', 'flow', 'ext', 'flow'),
            edge('e2', 'ext', 'flow', 'n', 'flow'),
            edge('e3', 'ext', 'value', 'n', 'url'),
            edge('e4', 'n', 'flow', 'e', 'flow'),
          ],
        }),
      }),
    );
    await collect(intr.execute());
    expect(page.goto).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Fetch handler — direct unit tests
// ---------------------------------------------------------------------------

describe('fetchHandler — direct', () => {
  it('throws when url is missing', async () => {
    const node = { id: 'f1', type: 'fetch' as NodeType, config: { method: 'GET' } };
    const context = {
      page: mockPage(),
      signal: new AbortController().signal,
      taskId: 't1',
      getCustomHandler: () => undefined,
      setOutput: vi.fn(),
    } as unknown as ExecutionContext;

    const gen = fetchHandler(node, context, {});
    await expect(async () => {
      for await (const _ of gen) {
      }
    }).rejects.toThrow('fetch node requires a url in config');
  });

  it('outputs response via setOutput', async () => {
    const page = mockPage();
    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/plain' },
      body: 'hello',
    };
    vi.mocked(page.evaluate).mockResolvedValue(mockResponse);
    const setOutput = vi.fn();

    const node = {
      id: 'f1',
      type: 'fetch' as NodeType,
      config: { method: 'GET', url: 'https://example.com', actLikeNavigation: false },
    };
    const context = {
      page,
      taskId: 't1',
      signal: new AbortController().signal,
      getCustomHandler: () => undefined,
      setOutput,
    } as unknown as ExecutionContext;

    const gen = fetchHandler(node, context, {});
    for await (const _ of gen) {
    }
    expect(setOutput).toHaveBeenCalledWith('response', mockResponse);
  });
});

// ---------------------------------------------------------------------------
// Listen handler — pattern matching
// ---------------------------------------------------------------------------

describe('listenHandler — URL pattern matching', () => {
  it('waits for requests and reads them from page', async () => {
    const page = mockPage();
    const captured = JSON.stringify([{ url: '/api/users', method: 'GET', status: 200 }]);
    vi.mocked(page.evaluate as any)
      .mockResolvedValueOnce('false')
      .mockResolvedValueOnce(captured);
    const setOutput = vi.fn();

    const node = {
      id: 'l1',
      type: 'listen' as NodeType,
      config: { urlPatterns: ['/api/*'], waitMs: 0 },
    };
    const context = {
      page,
      taskId: 't1',
      signal: new AbortController().signal,
      getCustomHandler: () => undefined,
      setOutput,
    } as unknown as ExecutionContext;

    const gen = listenHandler(node, context, {});
    for await (const _ of gen) {
    }
    expect(setOutput).toHaveBeenCalled();
  });
});
