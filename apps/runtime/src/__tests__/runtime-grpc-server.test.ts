import { describe, it, expect, vi, beforeEach } from "vitest";
import { RuntimeGrpcServer, type GrpcRuntime } from "../grpc/runtime-grpc-server.js";
import type { WorkflowEvent } from "@browsermesh/workflow";

function mockRuntime(): GrpcRuntime {
  return {
    executeWorkflow: vi.fn().mockImplementation(async function* () {}),
    cancelTask: vi.fn().mockResolvedValue({ taskId: "t1", state: "cancelled", message: "by user" }),
    pauseTask: vi.fn().mockResolvedValue({ taskId: "t1", state: "paused", message: "paused" }),
    resumeTask: vi.fn().mockResolvedValue({ taskId: "t1", state: "running" }),
    getTaskStatus: vi.fn().mockResolvedValue({ taskId: "t1", state: "running" }),
    listRunningTasks: vi.fn().mockResolvedValue([{ taskId: "t1", state: "running" }]),
  };
}

function createServer(runtime?: GrpcRuntime) {
  return new RuntimeGrpcServer({
    runtime: runtime ?? mockRuntime(),
    host: "0.0.0.0",
    port: 0,
  });
}

describe("RuntimeGrpcServer — ExecuteWorkflow (streaming)", () => {
  it("parses workflow_json and calls runtime.executeWorkflow", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const written: unknown[] = [];
    const call = {
      request: { task_id: "t1", workflow_json: JSON.stringify({ id: "w1", nodes: [], edges: [] }) },
      write: vi.fn((m: unknown) => written.push(m)),
      end: vi.fn(),
      destroy: vi.fn(),
    };

    await (server as any).handleExecuteWorkflow(call);
    expect(runtime.executeWorkflow).toHaveBeenCalledWith({
      workflow: { id: "w1", nodes: [], edges: [] },
      taskId: "t1",
    });
    expect(call.end).toHaveBeenCalled();
  });

  it("maps workflow events to proto response messages", async () => {
    const runtime = mockRuntime();

    const emitted: WorkflowEvent[] = [
      { type: "task_started", taskId: "t1", timestamp: new Date().toISOString(), workflowId: "w1" },
      { type: "step_started", taskId: "t1", timestamp: new Date().toISOString(), stepId: "n1", stepType: "navigate" },
      { type: "step_completed", taskId: "t1", timestamp: new Date().toISOString(), stepId: "n1", output: undefined },
      { type: "partial_data", taskId: "t1", timestamp: new Date().toISOString(), path: "title", value: "hello" },
      { type: "progress", taskId: "t1", timestamp: new Date().toISOString(), completedSteps: 1, totalSteps: 3, message: "1/3" },
      { type: "task_completed", taskId: "t1", timestamp: new Date().toISOString(), result: { ok: true } },
    ];

    async function* gen() { for (const e of emitted) yield e; }
    vi.mocked(runtime.executeWorkflow).mockImplementation(() => gen());

    const server = createServer(runtime);
    const written: unknown[] = [];
    const call = {
      request: { task_id: "t1", workflow_json: JSON.stringify({ id: "w1" }) },
      write: vi.fn((m: unknown) => written.push(m)),
      end: vi.fn(),
      destroy: vi.fn(),
    };

    await (server as any).handleExecuteWorkflow(call);
    expect(written).toHaveLength(emitted.length);
    expect(written[0]).toHaveProperty("task_started");
    expect(written[1]).toHaveProperty("step_started");
    expect(written[2]).toHaveProperty("step_completed");
    expect(written[3]).toHaveProperty("partial_data");
    expect(written[4]).toHaveProperty("progress");
    expect(written[5]).toHaveProperty("task_completed");
  });

  it("calls destroy on invalid workflow_json", async () => {
    const server = createServer();
    const call = {
      request: { task_id: "t1", workflow_json: "not-json" },
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    };
    await (server as any).handleExecuteWorkflow(call);
    expect(call.destroy).toHaveBeenCalled();
  });
});

describe("RuntimeGrpcServer — CancelTask (unary)", () => {
  it("calls runtime.cancelTask with task_id and maps response", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const call = { request: { task_id: "t1" } };
    const callback = vi.fn();

    await (server as any).handleCancelTask(call, callback);
    expect(runtime.cancelTask).toHaveBeenCalledWith("t1");
    expect(callback).toHaveBeenCalledWith(null, { task_id: "t1", state: "cancelled", message: "by user" });
  });
});

describe("RuntimeGrpcServer — PauseTask (unary)", () => {
  it("calls runtime.pauseTask and maps response", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const call = { request: { task_id: "t1" } };
    const callback = vi.fn();

    await (server as any).handlePauseTask(call, callback);
    expect(runtime.pauseTask).toHaveBeenCalledWith("t1");
    expect(callback).toHaveBeenCalledWith(null, { task_id: "t1", state: "paused", message: "paused" });
  });
});

describe("RuntimeGrpcServer — ResumeTask (unary)", () => {
  it("calls runtime.resumeTask and maps response", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const call = { request: { task_id: "t1" } };
    const callback = vi.fn();

    await (server as any).handleResumeTask(call, callback);
    expect(runtime.resumeTask).toHaveBeenCalledWith("t1");
    expect(callback).toHaveBeenCalledWith(null, { task_id: "t1", state: "running", message: "" });
  });
});

describe("RuntimeGrpcServer — GetTaskStatus (unary)", () => {
  it("calls runtime.getTaskStatus and maps response", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const call = { request: { task_id: "t1" } };
    const callback = vi.fn();

    await (server as any).handleGetTaskStatus(call, callback);
    expect(runtime.getTaskStatus).toHaveBeenCalledWith("t1");
    expect(callback).toHaveBeenCalledWith(null, { task_id: "t1", state: "running", message: "" });
  });
});

describe("RuntimeGrpcServer — ListRunningTasks (unary)", () => {
  it("calls runtime.listRunningTasks and maps response", async () => {
    const runtime = mockRuntime();
    const server = createServer(runtime);

    const call = { request: {} };
    const callback = vi.fn();

    await (server as any).handleListRunningTasks(call, callback);
    expect(runtime.listRunningTasks).toHaveBeenCalled();
    expect(callback).toHaveBeenCalledWith(null, {
      tasks: [{ task_id: "t1", state: "running", message: "" }],
    });
  });
});

describe("RuntimeGrpcServer — error handling", () => {
  it("propagates runtime errors to callback", async () => {
    const runtime = mockRuntime();
    vi.mocked(runtime.cancelTask).mockRejectedValue(new Error("not found"));
    const server = createServer(runtime);

    const call = { request: { task_id: "unknown" } };
    const callback = vi.fn();

    await (server as any).handleCancelTask(call, callback);
    expect(callback).toHaveBeenCalledWith(expect.any(Error), null);
    expect(callback.mock.calls[0][0].message).toBe("not found");
  });

  it("rejects ExecuteWorkflow when workflow_json has no id", async () => {
    const server = createServer();
    const call = {
      request: { task_id: "t1", workflow_json: JSON.stringify({ nodes: [] }) },
      write: vi.fn(),
      end: vi.fn(),
      destroy: vi.fn(),
    };
    await (server as any).handleExecuteWorkflow(call);
    expect(call.destroy).toHaveBeenCalled();
  });
});
