import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";

export type BrowserMeshClientOptions = {
  readonly endpoint: string;
};

export type ExecuteWorkflowOptions = {
  readonly taskId?: string;
  readonly workflow: WorkflowDefinition;
};

export class BrowserMeshClient {
  constructor(readonly options: BrowserMeshClientOptions) {}

  executeWorkflow(_options: ExecuteWorkflowOptions): AsyncIterable<WorkflowEvent> {
    throw new Error("BrowserMeshClient.executeWorkflow is not implemented in the initial scaffold.");
  }
}

