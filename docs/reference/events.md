# Events Reference

During workflow execution, the runtime emits a stream of events. Each event carries a `type` discriminator, `taskId`, and `timestamp`.

## Event Structure

All events share a common base:

```typescript
type WorkflowEventBase = {
  type: string;
  taskId: string;
  timestamp: string;   // ISO 8601
};
```

## Event Types

### task_started

Emitted when a workflow task begins execution.

```typescript
type TaskStartedEvent = {
  type: 'task_started';
  taskId: string;
  timestamp: string;
  workflowId: string;
};
```

### step_started

Emitted when a workflow node begins execution.

```typescript
type StepStartedEvent = {
  type: 'step_started';
  taskId: string;
  timestamp: string;
  stepId: string;
  stepType: NodeType;
};
```

### step_completed

Emitted when a workflow node finishes execution.

```typescript
type StepCompletedEvent = {
  type: 'step_completed';
  taskId: string;
  timestamp: string;
  stepId: string;
  output?: unknown;
};
```

### partial_data

Emitted when new data is extracted during workflow execution (useful for real-time display of scraping progress).

```typescript
type PartialDataEvent = {
  type: 'partial_data';
  taskId: string;
  timestamp: string;
  path: string;
  value: unknown;
};
```

### log

Emitted for log messages during workflow execution.

```typescript
type LogEvent = {
  type: 'log';
  taskId: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
};
```

### screenshot

Emitted when a screenshot is captured during execution.

```typescript
type ScreenshotEvent = {
  type: 'screenshot';
  taskId: string;
  timestamp: string;
  label: string;
  data: Uint8Array;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};
```

### progress

Emitted periodically to report task execution progress.

```typescript
type ProgressEvent = {
  type: 'progress';
  taskId: string;
  timestamp: string;
  completedSteps: number;
  totalSteps: number;
  message?: string;
};
```

### task_completed

Emitted when a workflow finishes successfully.

```typescript
type TaskCompletedEvent = {
  type: 'task_completed';
  taskId: string;
  timestamp: string;
  result?: unknown;
};
```

### task_failed

Emitted when a workflow fails due to an error.

```typescript
type TaskFailedEvent = {
  type: 'task_failed';
  taskId: string;
  timestamp: string;
  errorCode: string;
  message: string;
  retryable: boolean;
};
```

## Event Flow (Typical Order)

```
task_started
  step_started (navigate)
  step_completed (navigate)
  step_started (select)
  step_completed (select)
  log (info: "Processing item 1 of 5")
  step_started (extract)
  partial_data (path: "prices.0", value: "£10.00")
  step_completed (extract)
  ...
  progress (completedSteps: 5, totalSteps: 10)
  ...
  step_started (output)
  step_completed (output)
task_completed (or task_failed)
```

## Consuming Events via SDK

```typescript
const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });

for await (const event of client.executeWorkflow({ workflow })) {
  switch (event.type) {
    case 'task_started':
      console.log(`Task ${event.taskId} started for workflow ${event.workflowId}`);
      break;
    case 'progress':
      console.log(`${event.completedSteps}/${event.totalSteps}`);
      break;
    case 'task_completed':
      console.log('Result:', event.result);
      break;
    case 'task_failed':
      console.error('Failed:', event.message);
      break;
  }
}
```
