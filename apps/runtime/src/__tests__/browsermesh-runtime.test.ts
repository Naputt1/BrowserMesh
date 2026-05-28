import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WorkflowDefinition } from "@browsermesh/workflow";
import { BrowserMeshRuntime } from "../browsermesh-runtime.js";
import type { Page, Locator } from "../interpreter/types.js";

function mockLocator(): Locator {
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

function mockPage(): Page {
  return {
    goto: vi.fn(),
    locator: vi.fn().mockReturnValue(mockLocator()),
    evaluate: vi.fn(),
    close: vi.fn(),
    url: vi.fn().mockReturnValue("about:blank"),
  };
}

function mockPool(overrides?: Record<string, unknown>) {
  return {
    start: vi.fn(),
    acquire: vi.fn(),
    shutdown: vi.fn(),
    activeCount: 0,
    ...overrides,
  };
}

function wf(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return { id: "test-wf", nodes: [], edges: [], ...overrides };
}

async function collect(gen: AsyncIterable<unknown>): Promise<unknown[]> {
  const events: unknown[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

describe("BrowserMeshRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers task and acquires page on executeWorkflow", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const events = await collect(runtime.executeWorkflow({ workflow: wf() }));

    expect(pool.acquire).toHaveBeenCalled();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e: any) => e.type === "task_started")).toBe(true);
  });

  it("yields events and completes task for a navigate workflow", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const workflow = wf({
      nodes: [
        { id: "s", type: "start" },
        { id: "n1", type: "navigate", config: { url: "https://example.com" } },
        { id: "e", type: "end" },
      ],
      edges: [
        { id: "e1", source: "s", sourceHandle: "flow", target: "n1", targetHandle: "flow" },
        { id: "e2", source: "n1", sourceHandle: "flow", target: "e", targetHandle: "flow" },
      ],
    });

    const events = await collect(runtime.executeWorkflow({ workflow }));

    expect(events.map((e: any) => e.type)).toEqual([
      "task_started",
      "step_started",
      "step_completed",
      "step_started",
      "step_completed",
      "task_completed",
    ]);
  });

  it("releases the page after execution", async () => {
    const release = vi.fn();
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    await collect(runtime.executeWorkflow({ workflow: wf() }));
    expect(release).toHaveBeenCalled();
  });

  it("cancelTask runs cleanup and marks task cancelled", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const taskId = "cancel-me";
    const gen = runtime.executeWorkflow({ workflow: wf(), taskId });
    const iter = gen[Symbol.asyncIterator]();
    await iter.next();

    const status = await runtime.cancelTask(taskId);
    expect(status.state).toBe("cancelled");
  });

  it("pauseTask and resumeTask toggle state", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const taskId = "pause-resume";
    const gen = runtime.executeWorkflow({ workflow: wf(), taskId });
    const iter = gen[Symbol.asyncIterator]();
    await iter.next();

    const paused = await runtime.pauseTask(taskId);
    expect(paused.state).toBe("paused");

    const resumed = await runtime.resumeTask(taskId);
    expect(resumed.state).toBe("running");
  });

  it("listRunningTasks returns active tasks", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const gen = runtime.executeWorkflow({ workflow: wf(), taskId: "running-1" });
    const iter = gen[Symbol.asyncIterator]();
    await iter.next();

    const tasks = await runtime.listRunningTasks();
    expect(tasks.some((t: any) => t.taskId === "running-1")).toBe(true);
  });

  it("throws on cancelTask for unknown task", async () => {
    const pool = mockPool();
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);
    await expect(runtime.cancelTask("unknown")).rejects.toThrow("Task not found: unknown");
  });

  it("custom handlers are available to workflow execution", async () => {
    const page = mockPage();
    const pool = mockPool({ acquire: vi.fn().mockResolvedValue({ page, contextId: "ctx-1", release: vi.fn() }) });
    const runtime = new BrowserMeshRuntime({ host: "0.0.0.0", port: 50051 }, pool as any);

    const handlerFn = vi.fn().mockResolvedValue("ok");
    runtime.customHandlers.register("my-action", handlerFn);

    const workflow = wf({
      nodes: [
        { id: "s", type: "start" },
        { id: "c1", type: "custom", config: { handlerName: "my-action", payload: 42 } },
        { id: "e", type: "end" },
      ],
      edges: [
        { id: "e1", source: "s", sourceHandle: "flow", target: "c1", targetHandle: "flow" },
        { id: "e2", source: "c1", sourceHandle: "flow", target: "e", targetHandle: "flow" },
      ],
    });

    await collect(runtime.executeWorkflow({ workflow }));
    expect(handlerFn).toHaveBeenCalledWith(
      expect.objectContaining({ handlerName: "my-action", payload: 42 }),
      expect.anything(),
    );
  });
});
