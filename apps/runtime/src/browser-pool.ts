import { chromium } from "playwright";
import type { Browser, BrowserContext } from "playwright";
import type { Page } from "./interpreter/types";
import { PlaywrightPageAdapter } from "./playwright-page-adapter";

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
    this.browser = await chromium.launch({
      headless: this.options.headless ?? true,
      ...(this.options.chromiumPath ? { executablePath: this.options.chromiumPath } : {}),
    });
    this.started = true;
  }

  async acquire(
    sessionId?: string,
  ): Promise<{ page: Page; contextId: string; release: () => Promise<void> }> {
    this.ensureStarted();
    const context = await this.browser!.newContext();
    const pwPage = await context.newPage();
    const page = new PlaywrightPageAdapter(pwPage);
    const contextId = sessionId ?? crypto.randomUUID();
    this.contexts.set(contextId, context);
    return {
      page,
      contextId,
      release: async () => {
        await context.close();
        this.contexts.delete(contextId);
      },
    };
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
