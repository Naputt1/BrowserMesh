import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import type { WorkflowEvent } from '@browsermesh/workflow';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_PROTO_PATH = resolve(
  __dirname,
  '../../../../packages/proto/browsermesh/v1/runtime.proto',
);

export type GrpcRuntime = {
  executeWorkflow(input: {
    workflow: {
      id: string;
      name?: string;
      version?: string;
      nodes: readonly unknown[];
      edges: readonly unknown[];
    };
    taskId?: string;
  }): AsyncIterable<WorkflowEvent>;
  cancelTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }>;
  pauseTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }>;
  resumeTask(taskId: string): Promise<{ taskId: string; state: string; message?: string }>;
  getTaskStatus(taskId: string): Promise<{ taskId: string; state: string; message?: string }>;
  listRunningTasks(): Promise<Array<{ taskId: string; state: string; message?: string }>>;
  getWorkflowState(
    workflowId: string,
  ): Promise<{ workflowId: string; state: Record<string, unknown>; recovered: boolean }>;
  setWorkflowState(
    workflowId: string,
    state: Record<string, unknown>,
    commit?: boolean,
  ): Promise<{ workflowId: string; state: Record<string, unknown>; recovered: boolean }>;
  recoverWorkflowState(
    workflowId: string,
  ): Promise<{ workflowId: string; state: Record<string, unknown>; recovered: boolean }>;
};

export class RuntimeGrpcServer {
  private server: grpc.Server;
  private readonly runtime: GrpcRuntime;
  private readonly protoPath: string;
  private readonly host: string;
  private readonly port: number;

  constructor(config: { runtime: GrpcRuntime; protoPath?: string; host?: string; port?: number }) {
    this.runtime = config.runtime;
    this.protoPath = config.protoPath ?? DEFAULT_PROTO_PATH;
    this.host = config.host ?? '0.0.0.0';
    this.port = config.port ?? 50051;
    this.server = new grpc.Server();
  }

  async start(): Promise<void> {
    const packageDefinition = protoLoader.loadSync(this.protoPath, {
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
    const service = (pkg?.BrowserMeshRuntime as Record<string, unknown>)?.service as
      | grpc.ServiceDefinition
      | undefined;

    if (!service) {
      throw new Error('Failed to load BrowserMeshRuntime service from proto');
    }

    this.server.addService(service, {
      ExecuteWorkflow: this.handleExecuteWorkflow.bind(this),
      CancelTask: this.handleCancelTask.bind(this),
      PauseTask: this.handlePauseTask.bind(this),
      ResumeTask: this.handleResumeTask.bind(this),
      GetTaskStatus: this.handleGetTaskStatus.bind(this),
      ListRunningTasks: this.handleListRunningTasks.bind(this),
      GetWorkflowState: this.handleGetWorkflowState.bind(this),
      SetWorkflowState: this.handleSetWorkflowState.bind(this),
      RecoverWorkflowState: this.handleRecoverWorkflowState.bind(this),
    });

    return new Promise<void>((resolve, reject) => {
      this.server.bindAsync(
        `${this.host}:${this.port}`,
        grpc.ServerCredentials.createInsecure(),
        (err: Error | null, _port: number) => {
          if (err) reject(err);
          else {
            this.server.start();
            resolve();
          }
        },
      );
    });
  }

  async shutdown(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.server.tryShutdown(() => resolve());
    });
  }

  private async handleExecuteWorkflow(
    call: grpc.ServerWritableStream<unknown, unknown>,
  ): Promise<void> {
    const request = call.request as { task_id?: string; workflow_json?: string };
    const taskId = request.task_id ?? '';
    const workflowJson = request.workflow_json ?? '{}';

    let workflow: { id: string; nodes: readonly unknown[]; edges: readonly unknown[] };
    try {
      workflow = JSON.parse(workflowJson);
    } catch {
      call.destroy(new Error('Invalid workflow_json: unable to parse'));
      return;
    }

    if (!workflow.id) {
      call.destroy(new Error('workflow_json must contain an id field'));
      return;
    }

    try {
      for await (const event of this.runtime.executeWorkflow({
        workflow: { id: workflow.id, nodes: workflow.nodes ?? [], edges: workflow.edges ?? [] },
        taskId: taskId || undefined,
      })) {
        call.write(this.encodeWorkflowEvent(event));
      }
      call.end();
    } catch (err) {
      call.destroy(err instanceof Error ? err : new Error(String(err)));
    }
  }

  private async handleCancelTask(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { task_id?: string };
      const result = await this.runtime.cancelTask(request.task_id ?? '');
      callback(null, {
        task_id: result.taskId,
        state: result.state,
        message: result.message ?? '',
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handlePauseTask(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { task_id?: string };
      const result = await this.runtime.pauseTask(request.task_id ?? '');
      callback(null, {
        task_id: result.taskId,
        state: result.state,
        message: result.message ?? '',
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleResumeTask(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { task_id?: string };
      const result = await this.runtime.resumeTask(request.task_id ?? '');
      callback(null, {
        task_id: result.taskId,
        state: result.state,
        message: result.message ?? '',
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleGetTaskStatus(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { task_id?: string };
      const result = await this.runtime.getTaskStatus(request.task_id ?? '');
      callback(null, {
        task_id: result.taskId,
        state: result.state,
        message: result.message ?? '',
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleListRunningTasks(
    _call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const tasks = await this.runtime.listRunningTasks();
      callback(null, {
        tasks: tasks.map((t) => ({ task_id: t.taskId, state: t.state, message: t.message ?? '' })),
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleGetWorkflowState(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { workflow_id?: string };
      const result = await this.runtime.getWorkflowState(request.workflow_id ?? '');
      callback(null, {
        workflow_id: result.workflowId,
        state_json: JSON.stringify(result.state),
        recovered: result.recovered,
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleSetWorkflowState(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as {
        workflow_id?: string;
        state_json?: string;
        commit?: boolean;
      };
      const state = request.state_json ? JSON.parse(request.state_json) : {};
      const result = await this.runtime.setWorkflowState(
        request.workflow_id ?? '',
        state,
        request.commit,
      );
      callback(null, {
        workflow_id: result.workflowId,
        state_json: JSON.stringify(result.state),
        recovered: result.recovered,
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private async handleRecoverWorkflowState(
    call: grpc.ServerUnaryCall<unknown, unknown>,
    callback: grpc.sendUnaryData<unknown>,
  ): Promise<void> {
    try {
      const request = call.request as { workflow_id?: string };
      const result = await this.runtime.recoverWorkflowState(request.workflow_id ?? '');
      callback(null, {
        workflow_id: result.workflowId,
        state_json: JSON.stringify(result.state),
        recovered: result.recovered,
      });
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }

  private encodeWorkflowEvent(event: WorkflowEvent): Record<string, unknown> {
    const base: Record<string, unknown> = {
      task_id: event.taskId,
      timestamp: event.timestamp,
    };

    switch (event.type) {
      case 'task_started':
        return { ...base, task_started: { workflow_id: event.workflowId } };
      case 'step_started':
        return { ...base, step_started: { step_id: event.stepId, step_type: event.stepType } };
      case 'step_completed':
        return {
          ...base,
          step_completed: { step_id: event.stepId, output_json: JSON.stringify(event.output) },
        };
      case 'partial_data':
        return {
          ...base,
          partial_data: { path: event.path, value_json: JSON.stringify(event.value) },
        };
      case 'log':
        return { ...base, log: { level: event.level, message: event.message } };
      case 'screenshot':
        return {
          ...base,
          screenshot: { label: event.label, data: event.data, mime_type: event.mimeType },
        };
      case 'progress':
        return {
          ...base,
          progress: {
            completed_steps: event.completedSteps,
            total_steps: event.totalSteps,
            message: event.message ?? '',
          },
        };
      case 'task_completed':
        return { ...base, task_completed: { result_json: JSON.stringify(event.result) } };
      case 'task_failed':
        return {
          ...base,
          task_failed: {
            error_code: event.errorCode,
            message: event.message,
            retryable: event.retryable,
          },
        };
      case 'step_paused':
        return {
          ...base,
          step_paused: { step_id: event.stepId, step_type: event.stepType },
        };
    }
  }
}
