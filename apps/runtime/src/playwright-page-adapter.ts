import type { Page as PlaywrightPage } from "playwright-core";
import type { Page, Locator } from "./interpreter/types";

export class PlaywrightPageAdapter implements Page {
  constructor(private readonly pwPage: PlaywrightPage) {}

  async goto(url: string, options?: { waitUntil?: string }): Promise<void> {
    await this.pwPage.goto(
      url,
      options as Parameters<PlaywrightPage["goto"]>[1],
    );
  }

  locator(selector: string): Locator {
    return this.pwPage.locator(selector);
  }

  async evaluate(fn: string, ..._args: unknown[]): Promise<unknown> {
    return this.pwPage.evaluate(fn);
  }

  async close(): Promise<void> {
    await this.pwPage.close();
  }

  url(): string {
    return this.pwPage.url();
  }
}
