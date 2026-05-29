import type { BrowserContext, Page as PlaywrightPage } from 'playwright-core';
import type { Page } from './interpreter/types.js';
import { PlaywrightPageAdapter } from './playwright-page-adapter.js';

export class PageManager {
  private readonly pages = new Map<string, Page>();
  private defaultPageId: string | null = null;
  private context: BrowserContext | null = null;

  constructor(private readonly pageFactory: PageFactory) {}

  async initialize(context: BrowserContext, initialPage: PlaywrightPage): Promise<string> {
    this.context = context;
    const pageId = 'default';
    const adapter = this.pageFactory.createAdapter(initialPage);
    this.pages.set(pageId, adapter);
    this.defaultPageId = pageId;
    return pageId;
  }

  async createPage(pageId: string, url?: string): Promise<Page> {
    if (!this.context) throw new Error('PageManager not initialized');
    if (this.pages.has(pageId)) {
      throw new Error(`Page already exists: ${pageId}`);
    }
    const pwPage = await this.context.newPage();
    const adapter = this.pageFactory.createAdapter(pwPage);
    this.pages.set(pageId, adapter);
    if (url) {
      await pwPage.goto(url, { waitUntil: 'domcontentloaded' });
    }
    return adapter;
  }

  getPage(pageId?: string): Page {
    const id = pageId ?? this.defaultPageId;
    if (!id || !this.pages.has(id)) {
      throw new Error(`Page not found: ${id ?? 'default'}`);
    }
    return this.pages.get(id)!;
  }

  switchDefault(pageId: string): void {
    if (!this.pages.has(pageId)) {
      throw new Error(`Page not found: ${pageId}`);
    }
    this.defaultPageId = pageId;
  }

  async closePage(pageId: string): Promise<void> {
    const page = this.pages.get(pageId);
    if (!page) throw new Error(`Page not found: ${pageId}`);
    await page.close();
    this.pages.delete(pageId);
    if (this.defaultPageId === pageId) {
      const remaining = Array.from(this.pages.keys());
      this.defaultPageId = remaining.length > 0 ? remaining[0] : null;
    }
  }

  listPages(): { pageId: string; url: string }[] {
    return Array.from(this.pages.entries()).map(([pageId, page]) => ({
      pageId,
      url: page.url(),
    }));
  }

  async closeAll(): Promise<void> {
    for (const [pageId] of this.pages) {
      const page = this.pages.get(pageId)!;
      await page.close().catch(() => {});
    }
    this.pages.clear();
    this.defaultPageId = null;
  }
}

export interface PageFactory {
  createAdapter(pwPage: PlaywrightPage): Page;
  createPage(context: BrowserContext): Promise<PlaywrightPage>;
}

export class DefaultPageFactory implements PageFactory {
  createAdapter(pwPage: PlaywrightPage): Page {
    return new PlaywrightPageAdapter(pwPage);
  }

  async createPage(context: BrowserContext): Promise<PlaywrightPage> {
    return context.newPage();
  }
}
