import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";
import type { GrpcRuntime } from "./grpc/runtime-grpc-server";
import { TaskRegistry } from "./task-registry";
import { CustomHandlerRegistry } from "./custom-handler-registry";

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

  constructor(readonly config: RuntimeServiceConfig) {}

  async *executeWorkflow(input: ExecuteWorkflowInput): AsyncIterable<WorkflowEvent> {
    const taskId = input.taskId ?? crypto.randomUUID();
    this.taskRegistry.start(taskId, input.workflow.id);

    yield {
      type: "task_started",
      taskId,
      timestamp: new Date().toISOString(),
      workflowId: input.workflow.id,
    };

    yield {
      type: "task_completed",
      taskId,
      timestamp: new Date().toISOString(),
      result: undefined,
    };

    this.taskRegistry.complete(taskId);
  }

  async cancelTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    const updated = this.taskRegistry.cancel(taskId);
    return { taskId: updated.taskId, state: updated.state, message: updated.message };
  }

  async pauseTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
    const updated = this.taskRegistry.pause(taskId);
    return { taskId: updated.taskId, state: updated.state, message: updated.message };
  }

  async resumeTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }> {
    const info = this.taskRegistry.get(taskId);
    if (!info) throw new Error(`Task not found: ${taskId}`);
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
