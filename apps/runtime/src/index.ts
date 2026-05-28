import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";

export type RuntimeServiceConfig = {
  readonly host: string;
  readonly port: number;
};

export type ExecuteWorkflowInput = {
  readonly workflow: WorkflowDefinition;
  readonly taskId?: string;
};

export type RuntimeComponents = {
  readonly browserPool: "browser-pool-manager";
  readonly scheduler: "task-scheduler";
  readonly executionEngine: "execution-engine";
  readonly workflowInterpreter: "workflow-interpreter";
  readonly eventStream: "event-streaming-system";
};

export class BrowserMeshRuntime {
  readonly components: RuntimeComponents = {
    browserPool: "browser-pool-manager",
    scheduler: "task-scheduler",
    executionEngine: "execution-engine",
    workflowInterpreter: "workflow-interpreter",
    eventStream: "event-streaming-system"
  };

  constructor(readonly config: RuntimeServiceConfig) {}

  async *executeWorkflow(input: ExecuteWorkflowInput): AsyncIterable<WorkflowEvent> {
    yield {
      type: "task_started",
      taskId: input.taskId ?? "unassigned",
      timestamp: new Date().toISOString(),
      workflowId: input.workflow.id
    };
  }
}

