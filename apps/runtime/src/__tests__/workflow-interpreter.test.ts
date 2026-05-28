import { describe, it, expect, vi } from "vitest";
import type { WorkflowDefinition, WorkflowNode, WorkflowEvent } from "@browsermesh/workflow";
import { WorkflowInterpreter, type InterpreterOptions } from "../interpreter/workflow-interpreter.js";
import type { Page, Locator, CustomHandler } from "../interpreter/types.js";

function mockLocator(): Locator {
  return {
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    textContent: vi.fn().mockResolvedValue("extracted text"),
    getAttribute: vi.fn().mockResolvedValue("attr-value"),
    inputValue: vi.fn().mockResolvedValue("input-value"),
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
    url: vi.fn().mockReturnValue("about:blank"),
  };
}

function workflow(overrides?: Partial<WorkflowDefinition>): WorkflowDefinition {
  return { id: "test-wf", nodes: [], edges: [], ...overrides };
}

function node(id: string, type: WorkflowNode["type"], config?: Record<string, unknown>): WorkflowNode {
  return { id, type, config };
}

async function collect(gen: AsyncGenerator<WorkflowEvent>): Promise<WorkflowEvent[]> {
  const events: WorkflowEvent[] = [];
  for await (const e of gen) events.push(e);
  return events;
}

function makeOpts(overrides?: Partial<InterpreterOptions>): InterpreterOptions {
  return { workflow: workflow(), page: mockPage(), taskId: "t1", ...overrides };
}

describe("WorkflowInterpreter — node types", () => {
  describe("navigate", () => {
    it("calls page.goto with the configured url", async () => {
      const page = mockPage();
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "navigate", { url: "https://example.com" })] }),
      }));
      await collect(intr.execute());
      expect(page.goto).toHaveBeenCalledWith("https://example.com", undefined);
    });

    it("passes waitUntil when configured", async () => {
      const page = mockPage();
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "navigate", { url: "https://example.com", waitUntil: "networkidle" })] }),
      }));
      await collect(intr.execute());
      expect(page.goto).toHaveBeenCalledWith("https://example.com", { waitUntil: "networkidle" });
    });

    it("throws if url is missing", async () => {
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("n1", "navigate", {})] }),
      }));
      const events = await collect(intr.execute());
      expect(events.some((e) => e.type === "task_failed")).toBe(true);
    });
  });

  describe("click", () => {
    it("calls locator.click with the selector", async () => {
      const page = mockPage();
      const loc = mockLocator();
      vi.mocked(page.locator).mockReturnValue(loc);
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "click", { selector: "#btn" })] }),
      }));
      await collect(intr.execute());
      expect(page.locator).toHaveBeenCalledWith("#btn");
      expect(loc.click).toHaveBeenCalled();
    });

    it("throws if selector is missing", async () => {
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("n1", "click", {})] }),
      }));
      const events = await collect(intr.execute());
      expect(events.some((e) => e.type === "task_failed")).toBe(true);
    });
  });

  describe("type", () => {
    it("calls locator.fill with selector and value", async () => {
      const page = mockPage();
      const loc = mockLocator();
      vi.mocked(page.locator).mockReturnValue(loc);
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "type", { selector: "#input", value: "hello" })] }),
      }));
      await collect(intr.execute());
      expect(page.locator).toHaveBeenCalledWith("#input");
      expect(loc.fill).toHaveBeenCalledWith("hello");
    });
  });

  describe("wait", () => {
    it("waits for durationMs when no selector", async () => {
      const start = Date.now();
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("n1", "wait", { durationMs: 10 })] }),
      }));
      await collect(intr.execute());
      expect(Date.now() - start).toBeGreaterThanOrEqual(8);
    });

    it("calls locator.waitFor when selector is provided", async () => {
      const page = mockPage();
      const loc = mockLocator();
      vi.mocked(page.locator).mockReturnValue(loc);
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "wait", { selector: ".loaded" })] }),
      }));
      await collect(intr.execute());
      expect(loc.waitFor).toHaveBeenCalledWith(expect.objectContaining({ state: "visible" }));
    });
  });

  describe("scroll", () => {
    it("scrolls to coordinates when no selector", async () => {
      const page = mockPage();
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "scroll", { x: 0, y: 500 })] }),
      }));
      await collect(intr.execute());
      expect(page.evaluate).toHaveBeenCalledWith(expect.stringContaining("scrollTo(0, 500)"));
    });

    it("scrolls element into view when selector provided", async () => {
      const page = mockPage();
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "scroll", { selector: "#section" })] }),
      }));
      await collect(intr.execute());
      expect(page.evaluate).toHaveBeenCalledWith(expect.stringContaining("scrollIntoView"));
    });
  });

  describe("extract", () => {
    it("reads text content and emits partial_data", async () => {
      const page = mockPage();
      const loc = mockLocator();
      vi.mocked(page.locator).mockReturnValue(loc);
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "extract", { selector: ".item", property: "text", name: "title" })] }),
      }));
      const events = await collect(intr.execute());
      expect(loc.textContent).toHaveBeenCalled();
      expect(events).toContainEqual(
        expect.objectContaining({ type: "partial_data", path: "title", value: "extracted text" }),
      );
    });

    it("reads attribute and emits partial_data", async () => {
      const page = mockPage();
      const loc = mockLocator();
      vi.mocked(page.locator).mockReturnValue(loc);
      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({ nodes: [node("n1", "extract", { selector: "a", property: "attribute", attribute: "href" })] }),
      }));
      const events = await collect(intr.execute());
      expect(loc.getAttribute).toHaveBeenCalledWith("href");
      expect(events).toContainEqual(
        expect.objectContaining({ type: "partial_data", value: "attr-value" }),
      );
    });
  });

  describe("loop", () => {
    it("iterates over matching elements and executes child nodes", async () => {
      const page = mockPage();
      const childLoc = mockLocator();
      const parentLoc = mockLocator();
      vi.mocked(parentLoc.all).mockResolvedValue([childLoc, childLoc]);
      vi.mocked(page.locator).mockReturnValue(parentLoc);

      const intr = new WorkflowInterpreter(makeOpts({
        page,
        workflow: workflow({
          nodes: [
            node("loop", "loop", { selector: ".items", childNodeIds: ["child"] }),
            node("child", "click", { selector: "button" }),
          ],
        }),
      }));
      const events = await collect(intr.execute());

      // loop iterates 2 elements, each runs click child → 2 click calls
      expect(childLoc.click).toHaveBeenCalledTimes(2);
      // events include step_started/step_completed for loop + 2× child
      expect(events.filter((e) => e.type === "step_started")).toHaveLength(3);
      expect(events.filter((e) => e.type === "step_completed")).toHaveLength(3);
    });
  });

  describe("custom", () => {
    it("executes a registered custom handler with config", async () => {
      const customFn = vi.fn().mockResolvedValue("custom-result");
      const customHandlers = new Map([["myHandler", customFn as unknown as CustomHandler]]);
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("c1", "custom", { handlerName: "myHandler", foo: "bar" })] }),
        customHandlers,
      }));
      await collect(intr.execute());
      expect(customFn).toHaveBeenCalledWith(
        expect.objectContaining({ handlerName: "myHandler", foo: "bar" }),
        expect.anything(),
      );
    });

    it("fails with task_failed when handler name is missing", async () => {
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("c1", "custom", {})] }),
      }));
      const events = await collect(intr.execute());
      expect(events.some((e) => e.type === "task_failed")).toBe(true);
    });

    it("fails with task_failed for unknown handler name (unknown-handler failure)", async () => {
      const intr = new WorkflowInterpreter(makeOpts({
        workflow: workflow({ nodes: [node("c1", "custom", { handlerName: "nonexistent" })] }),
      }));
      const events = await collect(intr.execute());
      expect(events).toContainEqual(
        expect.objectContaining({
          type: "task_failed",
          errorCode: "HANDLER_ERROR",
        }),
      );
    });
  });
});

describe("WorkflowInterpreter — event ordering", () => {
  it("emits events in correct order for linear workflow", async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(makeOpts({
      page,
      workflow: workflow({
        nodes: [
          node("n1", "navigate", { url: "https://example.com" }),
          node("n2", "click", { selector: "#btn" }),
        ],
        edges: [{ id: "e1", source: "n1", target: "n2" }],
      }),
    }));
    const events = await collect(intr.execute());
    const types = events.map((e) => e.type);
    expect(types).toEqual([
      "task_started",
      "step_started",
      "step_completed",
      "step_started",
      "step_completed",
      "task_completed",
    ]);
    const stepStarted = events.filter((e) => e.type === "step_started") as Extract<WorkflowEvent, { type: "step_started" }>[];
    expect(stepStarted[0].stepId).toBe("n1");
    expect(stepStarted[1].stepId).toBe("n2");
  });

  it("handles multi-step workflow with correct start/completion events", async () => {
    const page = mockPage();
    const intr = new WorkflowInterpreter(makeOpts({
      page,
      workflow: workflow({
        nodes: [
          node("n1", "navigate", { url: "https://x.com" }),
          node("n2", "type", { selector: "#search", value: "test" }),
          node("n3", "click", { selector: "#go" }),
        ],
        edges: [
          { id: "e1", source: "n1", target: "n2" },
          { id: "e2", source: "n2", target: "n3" },
        ],
      }),
    }));
    const events = await collect(intr.execute());
    const failures = events.filter((e) => e.type === "task_failed");
    expect(failures).toHaveLength(0);
    expect(events[0].type).toBe("task_started");
    expect(events[events.length - 1].type).toBe("task_completed");
    const stepIds = events.filter((e) => e.type === "step_started").map((e) => (e as Extract<WorkflowEvent, { type: "step_started" }>).stepId);
    expect(stepIds).toEqual(["n1", "n2", "n3"]);
  });
});

describe("WorkflowInterpreter — unknown node type", () => {
  it("emits task_failed when node type has no handler", async () => {
    const intr = new WorkflowInterpreter(makeOpts({
      workflow: workflow({ nodes: [node("n1", "nonexistent_type" as WorkflowNode["type"], {})] }),
    }));
    const events = await collect(intr.execute());
    expect(events).toContainEqual(
      expect.objectContaining({ type: "task_failed", errorCode: "UNKNOWN_NODE_TYPE" }),
    );
  });
});

describe("WorkflowInterpreter — cancellation", () => {
  it("emits task_failed with CANCELLED if signal is already aborted", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const intr = new WorkflowInterpreter(makeOpts({
      workflow: workflow({ nodes: [node("n1", "navigate", { url: "https://x.com" })] }),
      signal: ctrl.signal,
    }));
    const events = await collect(intr.execute());
    expect(events).toContainEqual(
      expect.objectContaining({ type: "task_failed", errorCode: "CANCELLED" }),
    );
  });
});
