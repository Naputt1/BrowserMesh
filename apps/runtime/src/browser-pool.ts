import { launch } from "cloakbrowser";
import type { Browser, BrowserContext, Page as PlaywrightPage } from "playwright-core";
import type { Page } from "./interpreter/types.js";
import { PlaywrightPageAdapter } from "./playwright-page-adapter.js";

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
  private readonly contexts = new Map<string, BrowserContext>();
  private started = false;

  constructor(private readonly options: BrowserPoolOptions = {}) {}

  async start(): Promise<void> {
    if (this.started) return;
    this.browser = await launch({
      headless: this.options.headless ?? true,
      ...(this.options.chromiumPath ? { executablePath: this.options.chromiumPath } : {}),
    });
    this.started = true;
  }

  async acquire(
    sessionId?: string,
  ): Promise<AcquireResult> {
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

  async shutdown(): Promise<void> {
    for (const ctx of this.contexts.values()) {
      await ctx.close().catch(() => {});
    }
    this.contexts.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.started = false;
  }

  private ensureStarted(): void {
    if (!this.started || !this.browser) {
      throw new Error("BrowserPool not started. Call start() first.");
    }
  }
}
