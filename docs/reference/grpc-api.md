# gRPC API Reference

The BrowserMesh runtime exposes a gRPC service defined in `packages/proto/browsermesh/v1/runtime.proto`.

## Service Definition

```protobuf
service BrowserMeshRuntime {
  rpc ExecuteWorkflow(WorkflowRequest) returns (stream WorkflowEvent);
  rpc CancelTask(CancelTaskRequest) returns (TaskStatus);
  rpc PauseTask(TaskRequest) returns (TaskStatus);
  rpc ResumeTask(TaskRequest) returns (TaskStatus);
  rpc GetTaskStatus(TaskRequest) returns (TaskStatus);
  rpc ListRunningTasks(Empty) returns (ListRunningTasksResponse);
  rpc GetWorkflowState(WorkflowStateRequest) returns (WorkflowStateResponse);
  rpc SetWorkflowState(SetWorkflowStateRequest) returns (WorkflowStateResponse);
  rpc RecoverWorkflowState(WorkflowStateRequest) returns (WorkflowStateResponse);
}
```

## RPCs

### ExecuteWorkflow

The primary RPC. Accepts a workflow definition and returns a stream of execution events.

**Request:** `WorkflowRequest`
- `task_id` (string) — Optional task ID. Auto-generated if empty.
- `workflow_json` (string) — JSON-serialized `WorkflowIR`.
- `options` (ExecutionOptions) — Optional execution configuration.

**Response:** Stream of `WorkflowEvent`

### CancelTask

Cancels a running task.

**Request:** `CancelTaskRequest`
- `task_id` (string) — Task to cancel.
- `reason` (string) — Optional cancellation reason.

**Response:** `TaskStatus`

### PauseTask

Pauses a running task.

**Request:** `TaskRequest`
- `task_id` (string) — Task to pause.

**Response:** `TaskStatus`

### ResumeTask

Resumes a paused task.

**Request:** `TaskRequest`
- `task_id` (string) — Task to resume.

**Response:** `TaskStatus`

### GetTaskStatus

Gets the current status of a task.

**Request:** `TaskRequest`
- `task_id` (string) — Task to query.

**Response:** `TaskStatus`

### ListRunningTasks

Lists all currently running tasks.

**Request:** `Empty`

**Response:** `ListRunningTasksResponse`
- `tasks` (repeated TaskStatus) — List of running tasks.

### GetWorkflowState

Gets persisted state for a workflow.

**Request:** `WorkflowStateRequest`
- `workflow_id` (string) — Workflow to query.

**Response:** `WorkflowStateResponse`

### SetWorkflowState

Sets persisted state for a workflow.

**Request:** `SetWorkflowStateRequest`
- `workflow_id` (string) — Workflow to update.
- `state_json` (string) — JSON-serialized state.
- `commit` (bool) — Whether to persist immediately.

**Response:** `WorkflowStateResponse`

### RecoverWorkflowState

Recovers workflow state after a restart.

**Request:** `WorkflowStateRequest`
- `workflow_id` (string) — Workflow to recover.

**Response:** `WorkflowStateResponse`

## Messages

### WorkflowRequest

```protobuf
message WorkflowRequest {
  string task_id = 1;
  string workflow_json = 2;
  ExecutionOptions options = 3;
}
```

### ExecutionOptions

```protobuf
message ExecutionOptions {
  int32 timeout_ms = 1;
  int32 max_retries = 2;
  TimingControls timing = 3;
  BrowserOptions browser = 4;
}
```

### TimingControls

```protobuf
message TimingControls {
  int32 min_delay_ms = 1;
  int32 max_delay_ms = 2;
  string typing_speed = 3;
  bool request_jitter = 4;
  bool scroll_simulation = 5;
  bool random_mouse_movement = 6;
  bool idle_waits = 7;
}
```

### BrowserOptions

```protobuf
message BrowserOptions {
  string session_id = 1;
  string proxy_url = 2;
  bool stealth = 3;
  string fingerprint_profile = 4;
}
```

### WorkflowEvent

```protobuf
message WorkflowEvent {
  string task_id = 1;
  string timestamp = 2;
  oneof event {
    TaskStarted task_started = 10;
    StepStarted step_started = 11;
    StepCompleted step_completed = 12;
    PartialData partial_data = 13;
    LogEntry log = 14;
    Screenshot screenshot = 15;
    Progress progress = 16;
    TaskCompleted task_completed = 17;
    TaskFailed task_failed = 18;
  }
}
```

### Task Status Messages

```protobuf
message TaskRequest {
  string task_id = 1;
}

message CancelTaskRequest {
  string task_id = 1;
  string reason = 2;
}

message TaskStatus {
  string task_id = 1;
  string state = 2;
  string message = 3;
}

message ListRunningTasksResponse {
  repeated TaskStatus tasks = 1;
}
```

### State Messages

```protobuf
message WorkflowStateRequest {
  string workflow_id = 1;
}

message WorkflowStateResponse {
  string workflow_id = 1;
  string state_json = 2;
  bool recovered = 3;
}

message SetWorkflowStateRequest {
  string workflow_id = 1;
  string state_json = 2;
  bool commit = 3;
}
```

## Connecting Without the SDK

If you cannot use the `@browsermesh/sdk` package (e.g., from a different language), connect to the runtime using any standard gRPC client with the proto file at `packages/proto/browsermesh/v1/runtime.proto`.

### Node.js (without SDK)

```typescript
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const pkg = protoLoader.loadSync('runtime.proto');
const proto = grpc.loadPackageDefinition(pkg);
const client = new (proto.browsermesh.v1.BrowserMeshRuntime)(
  'localhost:50051',
  grpc.credentials.createInsecure(),
);

const call = client.ExecuteWorkflow({
  task_id: '',
  workflow_json: JSON.stringify(myWorkflow),
});

call.on('data', (event) => console.log(event));
call.on('end', () => console.log('done'));
```

### Python

```python
import grpc
import runtime_pb2 as pb2
import runtime_pb2_grpc as pb2_grpc

channel = grpc.insecure_channel('localhost:50051')
stub = pb2_grpc.BrowserMeshRuntimeStub(channel)

for event in stub.ExecuteWorkflow(pb2.WorkflowRequest(
    task_id='',
    workflow_json=json.dumps(my_ir),
)):
    print(event)
```
