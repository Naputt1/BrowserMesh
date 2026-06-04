# @browsermesh/proto

gRPC protocol definitions for the BrowserMesh runtime service. The canonical `.proto` file lives at `packages/proto/browsermesh/v1/runtime.proto`.

## Service

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

## Messages

### WorkflowRequest

```protobuf
message WorkflowRequest {
  string task_id = 1;
  string workflow_json = 2;       // JSON-serialized WorkflowIR
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

The streaming event wrapper. Uses a `oneof` to carry exactly one event type:

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

### Event Messages

| Message | Fields |
|---------|--------|
| `TaskStarted` | `workflow_id` |
| `StepStarted` | `step_id`, `step_type` |
| `StepCompleted` | `step_id`, `output_json` |
| `PartialData` | `path`, `value_json` |
| `LogEntry` | `level`, `message` |
| `Screenshot` | `label`, `data` (bytes), `mime_type` |
| `Progress` | `completed_steps`, `total_steps`, `message` |
| `TaskCompleted` | `result_json` |
| `TaskFailed` | `error_code`, `message`, `retryable` |

### Task Management Messages

```protobuf
message CancelTaskRequest {
  string task_id = 1;
  string reason = 2;
}

message TaskRequest {
  string task_id = 1;
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

### State Management Messages

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
