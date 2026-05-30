import { launch } from 'cloakbrowser';
import type { Browser, BrowserContext, Page as PlaywrightPage } from 'playwright-core';
import type { Page } from './interpreter/types.js';
import { PlaywrightPageAdapter } from './playwright-page-adapter.js';
import { createServer, type AddressInfo } from 'node:net';

export type AcquireResult = {
  page: Page;
  contextId: string;
  context: BrowserContext;
  pwPage: PlaywrightPage;
  release: () => Promise<void>;
};

export type BrowserPoolOptions = {
  readonly headless?: boolean;
  readonly chromiumPath?: string;
};

export class BrowserPool {
  private browser: Browser | null = null;
  private debugBrowser: Browser | null = null;
  private readonly contexts = new Map<string, BrowserContext>();
  private started = false;
  private cdpUrl: string | null = null;
  private debugCdpUrl: string | null = null;

  constructor(private readonly options: BrowserPoolOptions = {}) {}

  async start(): Promise<void> {
    if (this.started) return;
    const cdpPort = await findFreePort();
    this.browser = await launch({
      headless: this.options.headless ?? true,
      args: [`--remote-debugging-port=${cdpPort}`],
      ...(this.options.chromiumPath ? { executablePath: this.options.chromiumPath } : {}),
    });
    await this.discoverCdpUrl(cdpPort);
    this.started = true;
  }

  async acquire(sessionId?: string): Promise<AcquireResult> {
    this.ensureStarted();
    const context = await this.browser!.newContext();
    const pwPage = await context.newPage();
    const page = new PlaywrightPageAdapter(pwPage);
    const contextId = sessionId ?? crypto.randomUUID();
    this.contexts.set(contextId, context);
    return {
      page,
      pwPage,
      context,
      contextId,
      release: async () => {
        await context.close();
        this.contexts.delete(contextId);
      },
    };
  }

  getContext(contextId: string): BrowserContext | undefined {
    return this.contexts.get(contextId);
  }

  get activeCount(): number {
    return this.contexts.size;
  }

  getCdpUrl(): string | null {
    return this.cdpUrl;
  }

  async startDebug(): Promise<{ context: BrowserContext; pwPage: PlaywrightPage; cdpUrl: string; cdpPort: number }> {
    if (this.debugBrowser) {
      await this.debugBrowser.close().catch(() => {});
    }
    const cdpPort = await findFreePort();
    this.debugBrowser = await launch({
      headless: this.options.headless ?? true,
      args: [`--remote-debugging-port=${cdpPort}`],
      ...(this.options.chromiumPath ? { executablePath: this.options.chromiumPath } : {}),
    });
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
        const data = (await resp.json()) as { webSocketDebuggerUrl: string };
        this.debugCdpUrl = data.webSocketDebuggerUrl;
        break;
      } catch {
        if (attempt === 9) throw new Error('Could not discover CDP URL after 10 attempts');
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    const context = await this.debugBrowser.newContext();
    const pwPage = await context.newPage();
    return { context, pwPage, cdpUrl: this.debugCdpUrl!, cdpPort };
  }

  stopDebug(): void {
    if (this.debugBrowser) {
      this.debugBrowser.close().catch(() => {});
      this.debugBrowser = null;
      this.debugCdpUrl = null;
    }
  }

  async shutdown(): Promise<void> {
    for (const ctx of this.contexts.values()) {
      await ctx.close().catch(() => {});
    }
    this.contexts.clear();
    this.stopDebug();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.started = false;
    this.cdpUrl = null;
  }

  private async discoverCdpUrl(cdpPort: number): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        const resp = await fetch(`http://127.0.0.1:${cdpPort}/json/version`);
        const data = (await resp.json()) as { webSocketDebuggerUrl: string };
        this.cdpUrl = data.webSocketDebuggerUrl;
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    console.error('Could not discover CDP URL after 10 attempts');
  }

  private ensureStarted(): void {
    if (!this.started || !this.browser) {
      throw new Error('BrowserPool not started. Call start() first.');
    }
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}
