# @browsermesh/sdk

gRPC client for executing workflows on a BrowserMesh runtime server. Provides streaming workflow execution and task lifecycle management.

## Installation

```sh
pnpm add @browsermesh/sdk
```

## Exports

### BrowserMeshClient

The main client class for connecting to a runtime server:

```typescript
class BrowserMeshClient {
  constructor(options: BrowserMeshClientOptions);

  executeWorkflow(options: ExecuteWorkflowOptions): AsyncIterable<WorkflowEvent>;
  cancelTask(taskId: string): Promise<TaskStatusResult>;
  pauseTask(taskId: string): Promise<TaskStatusResult>;
  resumeTask(taskId: string): Promise<TaskStatusResult>;
  getTaskStatus(taskId: string): Promise<TaskStatusResult>;
  listRunningTasks(): Promise<TaskStatusResult[]>;
  getWorkflowState<T = unknown>(workflowId: string): Promise<WorkflowStateResult<T>>;
  setWorkflowState<T = unknown>(
    workflowId: string,
    state: T,
    options?: SetWorkflowStateOptions,
  ): Promise<WorkflowStateResult<T>>;
}
```

### BrowserMeshClientOptions

```typescript
type BrowserMeshClientOptions = {
  endpoint: string;            // gRPC server address (e.g., 'localhost:50051')
  protoPath?: string;          // Custom proto file path
};
```

### ExecuteWorkflowOptions

```typescript
type ExecuteWorkflowOptions = {
  taskId?: string;             // Optional task ID (auto-generated if omitted)
  workflow: WorkflowDefinition; // The workflow IR to execute
};
```

### TaskStatusResult

```typescript
type TaskStatusResult = {
  taskId: string;
  state: string;               // e.g., 'running', 'paused', 'completed', 'failed'
  message?: string;
};
```

### WorkflowStateResult

```typescript
type WorkflowStateResult<T = unknown> = {
  workflowId: string;
  state: T;                    // Any JSON-serializable value
  recovered: boolean;          // True if state was recovered from crash backup
};
```

### SetWorkflowStateOptions

```typescript
type SetWorkflowStateOptions = {
  commit?: boolean;            // Persist to disk immediately (default: false)
};
```

## Usage

### Execute a Workflow

```typescript
import { BrowserMeshClient, resolveWorkflow } from '@browsermesh/sdk/node';

const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });
const workflow = await resolveWorkflow('./my-workflow.ir.json');

for await (const event of client.executeWorkflow({ workflow })) {
  switch (event.type) {
    case 'step_started':
      console.log(`Step ${event.stepType} started`);
      break;
    case 'log':
      console.log(`[${event.level}] ${event.message}`);
      break;
    case 'screenshot':
      console.log(`Screenshot: ${event.label}`);
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

### State Persistence

The runtime persists state per workflow ID. Use `getWorkflowState` to retrieve state from previous runs and `setWorkflowState` to save state for future runs. The generic `<T>` parameter provides type-safe access — any JSON-serializable type is valid.

**Object state:**

```typescript
interface PaginationState {
  page: number;
  cursor: string;
}

const result = await client.getWorkflowState<PaginationState>('stateful-scraper');
console.log(result.state.page); // typed as number

await client.setWorkflowState<PaginationState>('stateful-scraper', {
  page: 1,
  cursor: 'abc',
});
```

**Primitive state:**

```typescript
// A counter workflow with just a number
const result = await client.getWorkflowState<number>('counter');
await client.setWorkflowState('counter', (result.state ?? 0) + 1);
```

### Manage Task Lifecycle

```typescript
const { taskId } = await client.executeWorkflow({ workflow });

// ... during execution ...

await client.pauseTask(taskId);
await client.resumeTask(taskId);
await client.cancelTask(taskId);

const status = await client.getTaskStatus(taskId);
console.log(status.state);
```
