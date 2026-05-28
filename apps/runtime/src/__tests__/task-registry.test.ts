import { describe, it, expect } from "vitest";
import { TaskRegistry } from "../task-registry";

describe("TaskRegistry", () => {
  it("starts a task in running state", () => {
    const registry = new TaskRegistry();
    const info = registry.start("t1", "w1");
    expect(info).toMatchObject({ taskId: "t1", workflowId: "w1", state: "running" });
    expect(info.createdAt).toBeDefined();
    expect(info.updatedAt).toBeDefined();
  });

  it("returns the task info from get()", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    const info = registry.get("t1");
    expect(info).toBeDefined();
    expect(info!.state).toBe("running");
  });

  it("returns undefined for unknown task", () => {
    const registry = new TaskRegistry();
    expect(registry.get("unknown")).toBeUndefined();
  });

  it("transitions to completed", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    const updated = registry.complete("t1", "done");
    expect(updated.state).toBe("completed");
    expect(updated.message).toBe("done");
  });

  it("transitions to failed", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    const updated = registry.fail("t1", "something broke");
    expect(updated.state).toBe("failed");
    expect(updated.message).toBe("something broke");
  });

  it("transitions to cancelled", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    const updated = registry.cancel("t1", "user cancelled");
    expect(updated.state).toBe("cancelled");
    expect(updated.message).toBe("user cancelled");
  });

  it("transitions to paused and back to running", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    const paused = registry.pause("t1", "waiting");
    expect(paused.state).toBe("paused");
    const resumed = registry.resume("t1");
    expect(resumed.state).toBe("running");
    expect(resumed.message).toBeUndefined();
  });

  it("throws on operation for unknown task", () => {
    const registry = new TaskRegistry();
    expect(() => registry.complete("unknown")).toThrow("Task not found: unknown");
    expect(() => registry.fail("unknown")).toThrow("Task not found: unknown");
    expect(() => registry.cancel("unknown")).toThrow("Task not found: unknown");
    expect(() => registry.pause("unknown")).toThrow("Task not found: unknown");
    expect(() => registry.resume("unknown")).toThrow("Task not found: unknown");
  });

  it("listRunning returns running and paused tasks only", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    registry.start("t2", "w1");
    registry.start("t3", "w1");
    registry.complete("t1");
    registry.pause("t2");

    const running = registry.listRunning();
    expect(running).toHaveLength(2);
    expect(running.map((t) => t.taskId).sort()).toEqual(["t2", "t3"]);
  });

  it("remove deletes a task", () => {
    const registry = new TaskRegistry();
    registry.start("t1", "w1");
    expect(registry.remove("t1")).toBe(true);
    expect(registry.get("t1")).toBeUndefined();
    expect(registry.remove("unknown")).toBe(false);
  });

  it("start accepts cleanup callback", async () => {
    const registry = new TaskRegistry();
    let cleaned = false;
    registry.start("t1", "w1", async () => { cleaned = true; });
    const info = registry.get("t1");
    expect(info!.cleanup).toBeDefined();
    await info!.cleanup!();
    expect(cleaned).toBe(true);
  });
});
