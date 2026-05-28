import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLaunch = vi.fn();
const mockBrowserClose = vi.fn();
const mockContextClose = vi.fn().mockResolvedValue(undefined);
const mockNewPage = vi.fn();

vi.mock("playwright", () => ({
  chromium: { launch: mockLaunch },
}));

function makeMockLocator() {
  return {
    click: vi.fn(),
    fill: vi.fn(),
    textContent: vi.fn().mockResolvedValue("text"),
    getAttribute: vi.fn().mockResolvedValue("attr"),
    inputValue: vi.fn().mockResolvedValue("val"),
    isVisible: vi.fn().mockResolvedValue(true),
    waitFor: vi.fn(),
    all: vi.fn().mockResolvedValue([]),
    first: vi.fn().mockReturnThis(),
    nth: vi.fn().mockReturnThis(),
    locator: vi.fn().mockReturnThis(),
  };
}

describe("BrowserPool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makePoolContext() {
    const mockLocator = makeMockLocator();
    const mockPage = {
      goto: vi.fn(),
      locator: vi.fn().mockReturnValue(mockLocator),
      evaluate: vi.fn(),
      close: vi.fn(),
      url: vi.fn().mockReturnValue("about:blank"),
    };
    mockNewPage.mockResolvedValue(mockPage);
    mockContextClose.mockResolvedValue(undefined);

    const mockContext = { newPage: mockNewPage, close: mockContextClose };
    mockLaunch.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: mockBrowserClose,
    });

    return {
      mockPage,
      mockLocator,
      mockContext,
    };
  }

  it("launches chromium on start with headless default", async () => {
    const { BrowserPool } = await import("../browser-pool");
    mockLaunch.mockResolvedValue({ newContext: vi.fn(), close: vi.fn() });
    const pool = new BrowserPool();
    await pool.start();
    expect(mockLaunch).toHaveBeenCalledWith({ headless: true });
  });

  it("launches chromium with custom options", async () => {
    const { BrowserPool } = await import("../browser-pool");
    mockLaunch.mockResolvedValue({ newContext: vi.fn(), close: vi.fn() });
    const pool = new BrowserPool({ headless: false, chromiumPath: "/custom/chrome" });
    await pool.start();
    expect(mockLaunch).toHaveBeenCalledWith({
      headless: false,
      executablePath: "/custom/chrome",
    });
  });

  it("acquire creates a new context and page", async () => {
    makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    const result = await pool.acquire();

    expect(result.page).toBeDefined();
    expect(result.contextId).toBeDefined();
    expect(typeof result.contextId).toBe("string");
    expect(mockNewPage).toHaveBeenCalled();
  });

  it("acquire returns a Page that delegates goto calls", async () => {
    const { mockPage } = makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    const { page } = await pool.acquire();

    await page.goto("https://example.com", { waitUntil: "networkidle" });
    expect(mockPage.goto).toHaveBeenCalledWith("https://example.com", { waitUntil: "networkidle" });
  });

  it("acquire returns a Page that delegates locator calls", async () => {
    const { mockPage, mockLocator } = makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    const { page } = await pool.acquire();

    const loc = page.locator("#btn");
    expect(mockPage.locator).toHaveBeenCalledWith("#btn");
    expect(loc).toBeDefined();
    // verify delegated methods work
    await loc.click();
    expect(mockLocator.click).toHaveBeenCalled();
  });

  it("release closes the context", async () => {
    makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    const { release } = await pool.acquire();

    await release();
    expect(mockContextClose).toHaveBeenCalled();
  });

  it("tracks active count", async () => {
    makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    expect(pool.activeCount).toBe(0);

    const a = await pool.acquire();
    expect(pool.activeCount).toBe(1);

    const b = await pool.acquire();
    expect(pool.activeCount).toBe(2);

    await a.release();
    expect(pool.activeCount).toBe(1);

    await b.release();
    expect(pool.activeCount).toBe(0);
  });

  it("shutdown closes all contexts and the browser", async () => {
    makePoolContext();
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await pool.start();
    await pool.acquire();
    await pool.acquire();

    await pool.shutdown();
    expect(mockContextClose).toHaveBeenCalledTimes(2);
    expect(mockBrowserClose).toHaveBeenCalled();
    expect(pool.activeCount).toBe(0);
  });

  it("acquire throws if not started", async () => {
    const { BrowserPool } = await import("../browser-pool");
    const pool = new BrowserPool();
    await expect(pool.acquire()).rejects.toThrow("BrowserPool not started");
  });

  it("start is idempotent", async () => {
    const { BrowserPool } = await import("../browser-pool");
    mockLaunch.mockResolvedValue({ newContext: vi.fn(), close: vi.fn() });
    const pool = new BrowserPool();
    await pool.start();
    await pool.start();
    expect(mockLaunch).toHaveBeenCalledTimes(1);
  });
});
