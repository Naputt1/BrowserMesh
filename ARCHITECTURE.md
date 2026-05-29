# BrowserMesh Architecture

BrowserMesh is infrastructure for browser automation, not a hosted workflow application. It provides browser execution, workflow runtime primitives, visual scraping authoring, extraction tooling, browser orchestration, and streaming execution APIs.

Client applications own authentication, persistence, workflow storage, orchestration, scheduling, billing, team management, and all multi-user application logic.

## System Layers

### BrowserMesh Runtime

The runtime is a standalone Node/TypeScript gRPC service designed for Docker and Kubernetes deployment. It uses a stateless execution model so replicas can scale horizontally.

Runtime responsibilities:

- Execute declarative workflows.
- Stream task progress, logs, screenshots, snapshots, and partial extraction output.
- Support retries, timeouts, cancellation, pause, resume, and task status APIs.
- Manage browser pooling, isolated browser contexts, context recycling, session reuse, proxy configuration, and stealth/fingerprint options.
- Apply human-like timing controls such as fixed delays, randomized delays, request jitter, typing simulation, scroll simulation, random mouse movement, and idle waits.

Runtime internal components:

- gRPC server boundary.
- Browser pool manager.
- Task scheduler.
- Execution engine.
- Workflow interpreter.
- Event streaming system.

The browser strategy prefers shared Chromium instances, isolated browser contexts, context recycling, and automatic cleanup. BrowserMesh should avoid one browser per task as the default execution model.

### BrowserMesh UI

The UI is a lightweight, embeddable React component library built with TypeScript, Tailwind, and shadcn-compatible primitives.

Client apps should be able to embed BrowserMesh authoring UI directly:

```tsx
<WorkflowBuilder />
```

UI responsibilities:

- Visual workflow authoring.
- Workflow graph editing.
- Step editing.
- Embedded browser preview.
- DOM overlay and selector picker.
- Live extraction preview.
- Integrated DevTools-style panels for console logs, network requests, DOM exploration, selector testing, and streamed task events.

Core UI components:

- `WorkflowBuilder`
- `WorkflowCanvas`
- `BrowserPane`
- `SelectorOverlay`
- `ExtractionMapper`
- `DevtoolsPanel`
- `TaskConsole`

## Type-Driven Extraction

BrowserMesh extraction authoring is type-first. Users define the desired TypeScript output shape before mapping fields visually.

The UI should guide users through extraction mapping based on the current scoped context. Users should not manually manage array indexing, object paths, or array bookkeeping.

Internally, extraction mapping is represented as scoped contexts such as `LoopContext<Product>`. Nested loop scopes automatically compose arrays, nested objects, and parent-child relationships.

## gRPC API Boundary

The canonical API definitions live in `packages/proto`.

The primary streaming operation is:

```proto
rpc ExecuteWorkflow(WorkflowRequest) returns (stream WorkflowEvent);
```

The stream emits events such as task start, step start, step completion, partial data, logs, screenshots, progress, task completion, and task failure.

Operational task APIs include:

- `CancelTask`
- `PauseTask`
- `ResumeTask`
- `GetTaskStatus`
- `ListRunningTasks`

## Non-Goals

BrowserMesh does not implement:

- Authentication.
- Persistence.
- Hosted workflow storage.
- Scheduling or orchestration.
- Billing.
- Team management.
- Multi-user application logic.

These concerns belong to products built on top of BrowserMesh.

## Package Boundaries

- `apps/runtime` owns runtime process composition and service startup.
- `packages/proto` owns wire-level gRPC contracts.
- `packages/workflow` owns shared workflow and extraction contracts.
- `packages/sdk` owns client-facing runtime connection primitives.
- `packages/ui` owns embeddable authoring components.
