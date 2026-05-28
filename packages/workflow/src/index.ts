export type WorkflowDefinition = {
  readonly id: string;
  readonly name?: string;
  readonly version?: string;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly timing?: TimingControls;
  readonly extraction?: ExtractionSchema;
};

export type WorkflowNode = {
  readonly id: string;
  readonly type: "navigate" | "click" | "type" | "wait" | "scroll" | "loop" | "extract" | "custom";
  readonly label?: string;
  readonly config?: Record<string, unknown>;
};

export type WorkflowEdge = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
};

export type TimingControls = {
  readonly minDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly typingSpeed?: "instant" | "fast" | "human" | "slow";
  readonly requestJitter?: boolean;
  readonly scrollSimulation?: boolean;
  readonly randomMouseMovement?: boolean;
  readonly idleWaits?: boolean;
};

export type ExtractionSchema = {
  readonly rootTypeName: string;
  readonly fields: readonly ExtractionField[];
};

export type ExtractionField = {
  readonly name: string;
  readonly valueType: "string" | "number" | "boolean" | "object" | "array";
  readonly selector?: string;
  readonly children?: readonly ExtractionField[];
};

export type ExtractionScope<TOutput = unknown> = {
  readonly id: string;
  readonly parentId?: string;
  readonly outputType: string;
  readonly path: readonly string[];
  readonly mode: "object" | "array";
  readonly sample?: TOutput;
};

export type LoopContext<TItem = unknown> = ExtractionScope<TItem> & {
  readonly mode: "array";
  readonly itemSelector: string;
};

export type WorkflowEvent =
  | TaskStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | PartialDataEvent
  | LogEvent
  | ScreenshotEvent
  | ProgressEvent
  | TaskCompletedEvent
  | TaskFailedEvent;

export type WorkflowEventBase<TType extends string> = {
  readonly type: TType;
  readonly taskId: string;
  readonly timestamp: string;
};

export type TaskStartedEvent = WorkflowEventBase<"task_started"> & {
  readonly workflowId: string;
};

export type StepStartedEvent = WorkflowEventBase<"step_started"> & {
  readonly stepId: string;
  readonly stepType: WorkflowNode["type"];
};

export type StepCompletedEvent = WorkflowEventBase<"step_completed"> & {
  readonly stepId: string;
  readonly output?: unknown;
};

export type PartialDataEvent = WorkflowEventBase<"partial_data"> & {
  readonly path: string;
  readonly value: unknown;
};

export type LogEvent = WorkflowEventBase<"log"> & {
  readonly level: "debug" | "info" | "warn" | "error";
  readonly message: string;
};

export type ScreenshotEvent = WorkflowEventBase<"screenshot"> & {
  readonly label: string;
  readonly data: Uint8Array;
  readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
};

export type ProgressEvent = WorkflowEventBase<"progress"> & {
  readonly completedSteps: number;
  readonly totalSteps: number;
  readonly message?: string;
};

export type TaskCompletedEvent = WorkflowEventBase<"task_completed"> & {
  readonly result?: unknown;
};

export type TaskFailedEvent = WorkflowEventBase<"task_failed"> & {
  readonly errorCode: string;
  readonly message: string;
  readonly retryable: boolean;
};

