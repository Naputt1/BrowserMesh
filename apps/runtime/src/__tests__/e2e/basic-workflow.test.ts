import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";
import { startRuntime, executeWorkflow, collectEvents } from "./helpers.js";
import type { RuntimeProcess } from "./helpers.js";

describe("Runtime E2E", () => {
  let rt: RuntimeProcess;

  beforeAll(async () => {
    rt = await startRuntime(60000);
  }, 90000);

  afterAll(() => {
    rt.stop();
  });

  it("executes a basic navigate → select → extract → output workflow", async () => {
    const workflow: WorkflowDefinition = {
      id: "e2e-basic",
      nodes: [
        { id: "s1", type: "start" },
        { id: "nav", type: "navigate", config: { url: "data:text/html,<h1>Hello World</h1>" } },
        { id: "sel", type: "select", config: { selector: "h1" } },
        { id: "ext", type: "extract", config: { property: "text" } },
        { id: "out", type: "output", config: { propertyPath: "title" } },
      ],
      edges: [
        { id: "e1", source: "s1", sourceHandle: "flow", target: "nav", targetHandle: "flow" },
        { id: "e2", source: "nav", sourceHandle: "flow", target: "sel", targetHandle: "flow" },
        { id: "e3", source: "sel", sourceHandle: "element", target: "ext", targetHandle: "element" },
        { id: "e4", source: "sel", sourceHandle: "flow", target: "ext", targetHandle: "flow" },
        { id: "e5", source: "ext", sourceHandle: "value", target: "out", targetHandle: "value" },
        { id: "e6", source: "ext", sourceHandle: "flow", target: "out", targetHandle: "flow" },
      ],
    };

    const taskId = await executeWorkflow(rt.restPort, workflow);
    expect(taskId).toBeTruthy();

    const events = await collectEvents(rt.restPort, taskId);

    expect(events.length).toBeGreaterThan(0);

    const types = events.map((e) => e.type);
    expect(types).toContain("task_started");
    expect(types).toContain("task_completed");
    expect(types).not.toContain("task_failed");

    const partialData = events.find(
      (e): e is WorkflowEvent & { path: string; value: unknown } =>
        e.type === "partial_data",
    ) as { path: string; value: unknown } | undefined;
    expect(partialData).toBeDefined();
    expect(partialData!.path).toBe("title");
    expect(partialData!.value).toBe("Hello World");
  }, 60000);

  it("reports task_failed for an invalid workflow", async () => {
    const workflow: WorkflowDefinition = {
      id: "e2e-bad",
      nodes: [
        { id: "s1", type: "start" },
        { id: "nav", type: "navigate", config: { url: "data:text/html,<h1>Hello</h1>" } },
        { id: "bad", type: "extract", config: { property: "missing" } },
      ],
      edges: [
        { id: "e1", source: "s1", sourceHandle: "flow", target: "nav", targetHandle: "flow" },
        { id: "e2", source: "nav", sourceHandle: "flow", target: "bad", targetHandle: "flow" },
        { id: "e3", source: "nav", sourceHandle: "flow", target: "bad", targetHandle: "element" },
      ],
    };

    const taskId = await executeWorkflow(rt.restPort, workflow);
    const events = await collectEvents(rt.restPort, taskId);

    const failed = events.find((e) => e.type === "task_failed");
    expect(failed).toBeDefined();
  }, 60000);
});
