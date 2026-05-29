export type TaskState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export type TaskInfo = {
  readonly taskId: string;
  readonly workflowId: string;
  readonly state: TaskState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly message?: string;
  readonly cleanup?: () => Promise<void>;
};

export class TaskRegistry {
  private readonly tasks = new Map<string, TaskInfo>();

  start(taskId: string, workflowId: string, cleanup?: () => Promise<void>): TaskInfo {
    const now = new Date().toISOString();
    const info: TaskInfo = {
      taskId,
      workflowId,
      state: 'running',
      createdAt: now,
      updatedAt: now,
      cleanup,
    };
    this.tasks.set(taskId, info);
    return info;
  }

  get(taskId: string): TaskInfo | undefined {
    return this.tasks.get(taskId);
  }

  complete(taskId: string, message?: string): TaskInfo {
    const info = this.getOrThrow(taskId);
    const updated: TaskInfo = {
      ...info,
      state: 'completed',
      updatedAt: new Date().toISOString(),
      message,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  fail(taskId: string, message?: string): TaskInfo {
    const info = this.getOrThrow(taskId);
    const updated: TaskInfo = {
      ...info,
      state: 'failed',
      updatedAt: new Date().toISOString(),
      message,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  cancel(taskId: string, message?: string): TaskInfo {
    const info = this.getOrThrow(taskId);
    const updated: TaskInfo = {
      ...info,
      state: 'cancelled',
      updatedAt: new Date().toISOString(),
      message,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  pause(taskId: string, message?: string): TaskInfo {
    const info = this.getOrThrow(taskId);
    const updated: TaskInfo = {
      ...info,
      state: 'paused',
      updatedAt: new Date().toISOString(),
      message,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  resume(taskId: string): TaskInfo {
    const info = this.getOrThrow(taskId);
    const updated: TaskInfo = {
      ...info,
      state: 'running',
      updatedAt: new Date().toISOString(),
      message: undefined,
    };
    this.tasks.set(taskId, updated);
    return updated;
  }

  listRunning(): TaskInfo[] {
    const result: TaskInfo[] = [];
    for (const info of this.tasks.values()) {
      if (info.state === 'running' || info.state === 'paused') {
        result.push(info);
      }
    }
    return result;
  }

  remove(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  private getOrThrow(taskId: string): TaskInfo {
    const info = this.tasks.get(taskId);
    if (!info) {
      throw new Error(`Task not found: ${taskId}`);
    }
    return info;
  }
}
