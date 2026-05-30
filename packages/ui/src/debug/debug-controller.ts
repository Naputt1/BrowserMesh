import type { WorkflowDefinition, WorkflowNode, WorkflowEvent, WorkflowEdge } from '@browsermesh/workflow';
import { CDPClient } from './cdp-client';
import { DebugInterpreter } from './debug-interpreter';

export type DebugControllerOptions = {
  readonly runtimeUrl: string;
};

export class DebugController {
  private readonly runtimeUrl: string;
  private cdp: CDPClient | null = null;
  private interpreter: DebugInterpreter | null = null;
  private taskId: string | null = null;
  private targetId: string | null = null;
  private sessionId: string | null = null;
  private _cdpUrl: string | null = null;
  private _cdpPort: number | null = null;
  private eventBuffer: WorkflowEvent[] = [];
  private running = false;
  private done = false;

  constructor(options: DebugControllerOptions) {
    this.runtimeUrl = options.runtimeUrl.replace(/\/$/, '');
  }

  get debugTaskId(): string | null {
    return this.taskId;
  }

  get debugTargetId(): string | null {
    return this.targetId;
  }

  get cdpUrl(): string | null {
    return this._cdpUrl;
  }

  get cdpPort(): number | null {
    return this._cdpPort;
  }

  get devToolsProxyWsUrl(): string | null {
    if (!this.taskId) return null;
    const wsProtocol = this.runtimeUrl.startsWith('https') ? 'wss' : 'ws';
    return `${wsProtocol}://${this.runtimeUrl.replace(/^https?:\/\//, '')}/api/debug/${this.taskId}/cdp`;
  }

  get devToolsFrontendUrl(): string | null {
    if (!this.taskId || !this.targetId) return null;
    const wsProtocol = this.runtimeUrl.startsWith('https') ? 'wss' : 'ws';
    const pageProxyWs = `${wsProtocol}://${this.runtimeUrl.replace(/^https?:\/\//, '')}/api/debug/${this.taskId}/devtools/page/${this.targetId}`;
    return `${this.runtimeUrl}/api/debug/${this.taskId}/devtools/inspector.html?ws=${encodeURIComponent(pageProxyWs)}`;
  }

  get events(): readonly WorkflowEvent[] {
    return this.eventBuffer;
  }

  get isRunning(): boolean {
    return this.running;
  }

  get isDone(): boolean {
    return this.done;
  }

  async start(workflow: WorkflowDefinition): Promise<void> {
    if (this.running) throw new Error('Debug session already running');

    const resp = await fetch(`${this.runtimeUrl}/api/debug/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workflow }),
    });

    if (!resp.ok) throw new Error(`Failed to start debug session: ${await resp.text()}`);

    const { taskId, cdpUrl, cdpPort } = await resp.json() as { taskId: string; cdpUrl: string; cdpPort: number };
    this.taskId = taskId;
    this._cdpUrl = cdpUrl;
    this._cdpPort = cdpPort;

    const proxyUrl = this.devToolsProxyWsUrl!;
    this.cdp = new CDPClient(proxyUrl);
    await this.cdp.waitForOpen();

    const entryUrl = findFirstNavigateUrl(workflow);
    const { targetId, sessionId } = await this.cdp.createPage(entryUrl);
    this.targetId = targetId;
    this.sessionId = sessionId;
    await this.cdp.enableDomain('Page', sessionId);
    await this.cdp.enableDomain('Runtime', sessionId);
    await this.cdp.enableDomain('Network', sessionId);

    this.interpreter = new DebugInterpreter({
      workflow,
      cdp: this.cdp,
      taskId,
      defaultSessionId: sessionId,
    });

    this.running = true;
    this.done = false;
  }

  async step(): Promise<readonly WorkflowEvent[]> {
    if (!this.interpreter || !this.cdp || !this.running) {
      throw new Error('Debug session not started');
    }

    if (this.running && !this.done) {
      this.interpreter.step();
    }

    return this.eventBuffer;
  }

  async runAll(): Promise<readonly WorkflowEvent[]> {
    if (!this.interpreter || !this.running) {
      throw new Error('Debug session not started');
    }

    this.interpreter.continue();

    return this.eventBuffer;
  }

  async execute(stepMode = false): Promise<void> {
    if (!this.interpreter || !this.cdp) {
      throw new Error('Debug session not started');
    }

    const gen = this.interpreter.execute(stepMode);
    const iterator = gen[Symbol.asyncIterator]();

    const pump = async (): Promise<void> => {
      while (!this.done) {
        const { value, done } = await iterator.next();
        if (done) {
          this.done = true;
          break;
        }
        this.eventBuffer.push(value);
      }
    };

    pump().catch(() => {
      this.done = true;
    });
  }

  async captureScreenshot(): Promise<string | null> {
    if (!this.cdp || !this.cdp.connected) return null;
    try {
      return await this.cdp.getPageScreenshot(this.sessionId ?? undefined);
    } catch {
      return null;
    }
  }

  async stop(): Promise<void> {
    this.done = true;
    this.running = false;

    this.interpreter?.cancel();
    this.cdp?.close();

    if (this.taskId) {
      try {
        await fetch(`${this.runtimeUrl}/api/debug/${this.taskId}/stop`, { method: 'POST' });
      } catch { /* ignore */ }
    }

    this.taskId = null;
    this.targetId = null;
    this.sessionId = null;
    this._cdpUrl = null;
    this._cdpPort = null;
    this.interpreter = null;
    this.cdp = null;
    this.eventBuffer = [];
  }
}

function findFirstNavigateUrl(workflow: WorkflowDefinition): string | undefined {
  const startNode = workflow.nodes.find((n) => n.type === 'start');
  if (!startNode) return;

  let currentId: string | null = startNode.id;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = workflow.nodes.find((n) => n.id === currentId);
    if (!node) break;
    if (node.type === 'navigate') {
      return (node.config?.url as string) ?? undefined;
    }
    if (node.type === 'end') break;
    const edge = workflow.edges.find((e) => e.source === currentId && e.sourceHandle === 'flow');
    currentId = edge?.target ?? null;
  }
}
