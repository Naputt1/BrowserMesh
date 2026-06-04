import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { WorkflowDefinition, WorkflowEvent, WorkflowNode } from '@browsermesh/workflow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PROTO_PATH = resolve(__dirname, './runtime.proto');

export type BrowserMeshClientOptions = {
  readonly endpoint: string;
  readonly protoPath?: string;
  readonly _grpcClient?: object;
};

export type ExecuteWorkflowOptions = {
  readonly taskId?: string;
  readonly workflow: WorkflowDefinition;
};

export type TaskStatusResult = {
  readonly taskId: string;
  readonly state: string;
  readonly message?: string;
};

/** Result of a workflow state operation. The `state` field holds any JSON-serializable value. */
export type WorkflowStateResult<T = unknown> = {
  readonly workflowId: string;
  /** The persisted state value (any JSON-serializable type — object, array, number, string, boolean, etc.). */
  readonly state: T;
  /** True if the state was recovered from a crash-recovery backup after a runtime restart. */
  readonly recovered: boolean;
};

/** Options for persisting workflow state. */
export type SetWorkflowStateOptions = {
  /** Immediately flush the state to disk (default: false — uses debounced backup). */
  readonly commit?: boolean;
};

export class BrowserMeshClient {
  private readonly client: {
    ExecuteWorkflow(request: object): AsyncIterable<object>;
    CancelTask(request: object, callback: (err: Error | null, response: object) => void): void;
    PauseTask(request: object, callback: (err: Error | null, response: object) => void): void;
    ResumeTask(request: object, callback: (err: Error | null, response: object) => void): void;
    GetTaskStatus(request: object, callback: (err: Error | null, response: object) => void): void;
    ListRunningTasks(
      request: object,
      callback: (err: Error | null, response: object) => void,
    ): void;
    GetWorkflowState(
      request: object,
      callback: (err: Error | null, response: object) => void,
    ): void;
    SetWorkflowState(
      request: object,
      callback: (err: Error | null, response: object) => void,
    ): void;
  };

  constructor(readonly options: BrowserMeshClientOptions) {
    if (options._grpcClient) {
      this.client = options._grpcClient as typeof this.client;
    } else {
      const protoPath = options.protoPath ?? DEFAULT_PROTO_PATH;
      const packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: false,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const proto = grpc.loadPackageDefinition(packageDefinition) as Record<string, unknown>;
      const pkg = (proto.browsermesh as Record<string, unknown>)?.v1 as
        | Record<string, unknown>
        | undefined;
      const Ctor = pkg?.BrowserMeshRuntime as new (
        endpoint: string,
        creds: grpc.ChannelCredentials,
      ) => typeof this.client;
      this.client = new Ctor(options.endpoint, grpc.credentials.createInsecure());
    }
  }

  async *executeWorkflow(options: ExecuteWorkflowOptions): AsyncIterable<WorkflowEvent> {
    const stream = this.client.ExecuteWorkflow({
      task_id: options.taskId ?? '',
      workflow_json: JSON.stringify(options.workflow),
    });

    for await (const raw of stream) {
      yield this.decodeWorkflowEvent(raw as Record<string, unknown>);
    }
  }

  cancelTask(taskId: string): Promise<TaskStatusResult> {
    return this.unaryCall('CancelTask', { task_id: taskId });
  }

  pauseTask(taskId: string): Promise<TaskStatusResult> {
    return this.unaryCall('PauseTask', { task_id: taskId });
  }

  resumeTask(taskId: string): Promise<TaskStatusResult> {
    return this.unaryCall('ResumeTask', { task_id: taskId });
  }

  getTaskStatus(taskId: string): Promise<TaskStatusResult> {
    return this.unaryCall('GetTaskStatus', { task_id: taskId });
  }

  listRunningTasks(): Promise<TaskStatusResult[]> {
    return new Promise((resolve, reject) => {
      this.client.ListRunningTasks({}, (err: Error | null, response: object) => {
        if (err) {
          reject(err);
        } else {
          const raw = response as {
            tasks?: Array<{ task_id: string; state: string; message?: string }>;
          };
          resolve(
            (raw.tasks ?? []).map((t) => ({
              taskId: t.task_id,
              state: t.state,
              message: t.message ?? undefined,
            })),
          );
        }
      });
    });
  }

  /**
   * Retrieve persisted state for a workflow.
   *
   * State can be any JSON-serializable value — an object, number, boolean, string, array, etc.
   * The generic `<T>` provides type-safe access to the returned state.
   *
   * @example
   *   const result = await client.getWorkflowState<{ page: number }>('my-workflow');
   *   console.log(result.state.page);
   *
   * @example
   *   const count = await client.getWorkflowState<number>('counter');
   */
  getWorkflowState<T = unknown>(workflowId: string): Promise<WorkflowStateResult<T>> {
    return this.stateUnaryCall<T>('GetWorkflowState', { workflow_id: workflowId });
  }

  /**
   * Persist state for a workflow. The state value is serialized with `JSON.stringify`
   * and stored on the runtime server.
   *
   * Any JSON-serializable type is valid — objects, numbers, booleans, strings, arrays.
   * The generic `<T>` ensures the saved value matches the expected shape.
   *
   * @example
   *   await client.setWorkflowState('my-workflow', { page: 3, cursor: 'abc' });
   *
   * @example
   *   await client.setWorkflowState('counter', 42);
   *
   * @example
   *   await client.setWorkflowState('my-workflow', { page: 1 }, { commit: true });
   */
  setWorkflowState<T = unknown>(
    workflowId: string,
    state: T,
    options?: SetWorkflowStateOptions,
  ): Promise<WorkflowStateResult<T>> {
    return this.stateUnaryCall<T>('SetWorkflowState', {
      workflow_id: workflowId,
      state_json: JSON.stringify(state),
      commit: options?.commit ?? false,
    });
  }

  private unaryCall(
    method: 'CancelTask' | 'PauseTask' | 'ResumeTask' | 'GetTaskStatus',
    request: object,
  ): Promise<TaskStatusResult> {
    return new Promise((resolve, reject) => {
      (
        this.client[method] as (
          req: object,
          cb: (err: Error | null, response: object) => void,
        ) => void
      )(request, (err: Error | null, response: object) => {
        if (err) {
          reject(err);
        } else {
          const raw = response as { task_id: string; state: string; message?: string };
          resolve({
            taskId: raw.task_id,
            state: raw.state,
            message: raw.message ?? undefined,
          });
        }
      });
    });
  }

  private stateUnaryCall<T>(
    method: 'GetWorkflowState' | 'SetWorkflowState',
    request: object,
  ): Promise<WorkflowStateResult<T>> {
    return new Promise((resolve, reject) => {
      (
        this.client[method] as (
          req: object,
          cb: (err: Error | null, response: object) => void,
        ) => void
      )(request, (err: Error | null, response: object) => {
        if (err) {
          reject(err);
        } else {
          const raw = response as {
            workflow_id: string;
            state_json: string;
            recovered: boolean;
          };
          resolve({
            workflowId: raw.workflow_id,
            state: raw.state_json ? JSON.parse(raw.state_json) : undefined,
            recovered: raw.recovered,
          } as WorkflowStateResult<T>);
        }
      });
    });
  }

  private decodeWorkflowEvent(raw: Record<string, unknown>): WorkflowEvent {
    const base = { taskId: raw.task_id as string, timestamp: raw.timestamp as string };

    if (raw.task_started) {
      const ev = raw.task_started as { workflow_id: string };
      return { ...base, type: 'task_started', workflowId: ev.workflow_id };
    }
    if (raw.step_started) {
      const ev = raw.step_started as { step_id: string; step_type: string };
      return {
        ...base,
        type: 'step_started',
        stepId: ev.step_id,
        stepType: ev.step_type as WorkflowNode['type'],
      };
    }
    if (raw.step_completed) {
      const ev = raw.step_completed as { step_id: string; output_json?: string };
      return {
        ...base,
        type: 'step_completed',
        stepId: ev.step_id,
        output: ev.output_json ? JSON.parse(ev.output_json) : undefined,
      };
    }
    if (raw.partial_data) {
      const ev = raw.partial_data as { path: string; value_json: string };
      return { ...base, type: 'partial_data', path: ev.path, value: JSON.parse(ev.value_json) };
    }
    if (raw.log) {
      const ev = raw.log as { level: string; message: string };
      return {
        ...base,
        type: 'log',
        level: ev.level as 'debug' | 'info' | 'warn' | 'error',
        message: ev.message,
      };
    }
    if (raw.screenshot) {
      const ev = raw.screenshot as { label: string; data: Uint8Array; mime_type: string };
      return {
        ...base,
        type: 'screenshot',
        label: ev.label,
        data: ev.data,
        mimeType: ev.mime_type as 'image/png' | 'image/jpeg' | 'image/webp',
      };
    }
    if (raw.progress) {
      const ev = raw.progress as { completed_steps: number; total_steps: number; message?: string };
      return {
        ...base,
        type: 'progress',
        completedSteps: ev.completed_steps,
        totalSteps: ev.total_steps,
        message: ev.message ?? undefined,
      };
    }
    if (raw.task_completed) {
      const ev = raw.task_completed as { result_json?: string };
      return {
        ...base,
        type: 'task_completed',
        result: ev.result_json ? JSON.parse(ev.result_json) : undefined,
      };
    }
    if (raw.task_failed) {
      const ev = raw.task_failed as { error_code: string; message: string; retryable: boolean };
      return {
        ...base,
        type: 'task_failed',
        errorCode: ev.error_code,
        message: ev.message,
        retryable: ev.retryable,
      };
    }

    throw new Error(`Unknown workflow event: ${JSON.stringify(raw)}`);
  }
}
