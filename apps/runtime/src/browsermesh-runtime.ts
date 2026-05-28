import { join } from "node:path";
import type { WorkflowDefinition, WorkflowEvent, GlobalSettings } from "@browsermesh/workflow";
import type { GrpcRuntime } from "./grpc/runtime-grpc-server.js";
import { TaskRegistry } from "./task-registry.js";
import { CustomHandlerRegistry } from "./custom-handler-registry.js";
import { BrowserPool } from "./browser-pool.js";
import { WorkflowInterpreter } from "./interpreter/workflow-interpreter.js";
import { PauseController } from "./pause-controller.js";
import { GlobalStateStore } from "./global-state-store.js";
import { PageManager, DefaultPageFactory } from "./page-manager.js";

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
  private readonly stateStores = new Map<string, GlobalStateStore>();
  private stateDir: string = join(process.cwd(), "state");

  setStateDir(dir: string): void {
    this.stateDir = dir;
  }

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

    const settings = input.workflow.settings;
    const multiPage = settings?.multiPage === true;

    let stateStore: GlobalStateStore | undefined;
    if (settings?.statePersistence !== false) {
      const key = input.workflow.id;
      if (!this.stateStores.has(key)) {
        const store = new GlobalStateStore(key, this.stateDir);
        await store.initialize();
        this.stateStores.set(key, store);
      }
      stateStore = this.stateStores.get(key);
    }

    const { page, context, pwPage, release } = await this.browserPool.acquire();

    let pageManager: PageManager | undefined;
    if (multiPage) {
      pageManager = new PageManager(new DefaultPageFactory());
      await pageManager.initialize(context, pwPage);
    }

    try {
      const interpreter = new WorkflowInterpreter({
        workflow: input.workflow,
        page,
        customHandlers: this.customHandlers.toMap(),
        taskId,
        signal: abortController.signal,
        pauseController,
        stateStore,
        pageManager,
      });

      yield* interpreter.execute();

      if (stateStore) {
        await stateStore.commit().catch(() => {});
      }
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
      if (pageManager) {
        await pageManager.closeAll().catch(() => {});
      }
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

  private async getOrCreateStateStore(workflowId: string): Promise<GlobalStateStore> {
    let store = this.stateStores.get(workflowId);
    if (!store) {
      store = new GlobalStateStore(workflowId, this.stateDir);
      await store.initialize();
      this.stateStores.set(workflowId, store);
    }
    return store;
  }

  async getWorkflowState(workflowId: string): Promise<WorkflowStateResult> {
    const store = await this.getOrCreateStateStore(workflowId);
    return { workflowId, state: store.getAll(), recovered: true };
  }

  async setWorkflowState(workflowId: string, state: Record<string, unknown>, commit = false): Promise<WorkflowStateResult> {
    const store = await this.getOrCreateStateStore(workflowId);
    for (const [key, value] of Object.entries(state)) {
      store.set(key, value);
    }
    if (commit) {
      await store.commit();
    }
    return { workflowId, state: store.getAll(), recovered: true };
  }

  async recoverWorkflowState(workflowId: string): Promise<WorkflowStateResult> {
    const exists = await GlobalStateStore.recover(workflowId, this.stateDir);
    if (!exists) {
      return { workflowId, state: {}, recovered: false };
    }
    const store = await this.getOrCreateStateStore(workflowId);
    return { workflowId, state: store.getAll(), recovered: true };
  }
}

export type WorkflowStateResult = {
  workflowId: string;
  state: Record<string, unknown>;
  recovered: boolean;
};
