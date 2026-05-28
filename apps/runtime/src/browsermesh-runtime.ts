import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";
import type { GrpcRuntime } from "./grpc/runtime-grpc-server";
import { TaskRegistry } from "./task-registry";
import { CustomHandlerRegistry } from "./custom-handler-registry";
import { BrowserPool } from "./browser-pool";
import { WorkflowInterpreter } from "./interpreter/workflow-interpreter";
import { PauseController } from "./pause-controller";

export type RuntimeServiceConfig = {
  readonly host: string;
  readonly port: number;
};

export type ExecuteWorkflowInput = {
  readonly workflow: WorkflowDefinition;
  readonly taskId?: string;
};

export class BrowserMeshRuntime implements GrpcRuntime {
  readonly taskRegistry = new TaskRegistry();
  readonly customHandlers = new CustomHandlerRegistry();
  private readonly pauseControllers = new Map<string, PauseController>();

  constructor(
    readonly config: RuntimeServiceConfig,
    private readonly browserPool: BrowserPool,
  ) {}

  async *executeWorkflow(input: ExecuteWorkflowInput): AsyncIterable<WorkflowEvent> {
    const taskId = input.taskId ?? crypto.randomUUID();
    const abortController = new AbortController();
    const pauseController = new PauseController();

    this.pauseControllers.set(taskId, pauseController);

    this.taskRegistry.start(taskId, input.workflow.id, async () => {
      abortController.abort();
    });

    const { page, release } = await this.browserPool.acquire();

    try {
      const interpreter = new WorkflowInterpreter({
        workflow: input.workflow,
        page,
        customHandlers: this.customHandlers.toMap(),
        taskId,
        signal: abortController.signal,
        pauseController,
      });

      yield* interpreter.execute();

      this.taskRegistry.complete(taskId);
    } catch (err) {
      yield {
        type: "task_failed" as const,
        taskId,
        timestamp: new Date().toISOString(),
        errorCode: "RUNTIME_ERROR",
        message: err instanceof Error ? err.message : String(err),
        retryable: false,
      };
      this.taskRegistry.fail(taskId, err instanceof Error ? err.message : String(err));
    } finally {
      await release();
      this.pauseControllers.delete(taskId);
    }
  }

  async cancelTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    await info.cleanup?.();
    const updated = this.taskRegistry.cancel(taskId);
    return { taskId: updated.taskId, state: updated.state, message: updated.message };
  }

  async pauseTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    const pc = this.pauseControllers.get(taskId);
    if (pc) pc.pause();
    const updated = this.taskRegistry.pause(taskId);
    return { taskId: updated.taskId, state: updated.state, message: updated.message };
  }

  async resumeTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    const pc = this.pauseControllers.get(taskId);
    if (pc) pc.resume();
    const updated = this.taskRegistry.resume(taskId);
    return { taskId: updated.taskId, state: updated.state, message: updated.message };
  }

  async getTaskStatus(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    return { taskId: info.taskId, state: info.state, message: info.message };
  }

  async listRunningTasks(): Promise<Array<{ taskId: string; state: string; message?: string }>> {
    return this.taskRegistry.listRunning().map((t) => ({
      taskId: t.taskId,
      state: t.state,
      message: t.message,
    }));
  }
}
