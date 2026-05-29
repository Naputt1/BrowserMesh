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
