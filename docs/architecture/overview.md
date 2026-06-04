# Architecture Overview

BrowserMesh is infrastructure for browser automation. It provides browser execution, workflow runtime primitives, visual scraping authoring, extraction tooling, browser orchestration, and streaming execution APIs.

Client applications own authentication, persistence, workflow storage, orchestration, scheduling, billing, team management, and all multi-user application logic.

## System Layers

### Authoring Layer

Workflows can be authored through three paths:

1. **TypeScript API** (`@browsermesh/workflow-builder`) — fluent builder pattern with type-safe extraction mapping
2. **Visual Editor** (`@browsermesh/ui`) — embeddable React components with drag-drop canvas, browser preview, and selector picker
3. **Precompiled JSON** — raw `WorkflowIR` files, generated or hand-written

### Compilation Layer

The `@browsermesh/compiler` package transforms TypeScript workflow definitions at build time:

- A Vite plugin detects `createWorkflow()` calls in source files
- The builder function is evaluated at build time to produce the `WorkflowIR` graph
- The IR is emitted as a `.ir.json` sidecar file alongside the compiled JavaScript
- The original source is rewritten to load the IR at runtime instead of re-evaluating the builder

All three authoring paths converge on the same `WorkflowIR` format.

### Runtime Layer

The runtime server (`apps/runtime`) is a standalone Node.js gRPC/REST service:

- Executes compiled `WorkflowIR` graphs deterministically
- Streams task progress, logs, screenshots, and partial extraction output
- Supports retries, timeouts, cancellation, pause, resume, and task status APIs
- Manages browser pooling with isolated contexts, session reuse, and proxy configuration
- Applies human-like timing controls

### Client Layer

Clients connect to the runtime via:

- **`@browsermesh/sdk`** — TypeScript gRPC client with streaming workflow execution
- **REST API** — HTTP alternative to gRPC
- **Any gRPC client** — proto file provided for other languages

## Component Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     Client Application                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ TypeScript│  │  Visual  │  │  JSON / Remote / S3  │   │
│  │  API      │  │  Editor  │  │  Source              │   │
│  └─────┬─────┘  └─────┬────┘  └──────────┬───────────┘   │
└────────┼───────────────┼─────────────────┼───────────────┘
         │               │                 │
         ▼               ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│               Build-Time Compiler (Vite)                  │
│         ┌──────────────────────────────┐                 │
│         │  createWorkflow() → .ir.json  │                 │
│         └──────────────┬───────────────┘                 │
└────────────────────────┼─────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     WorkflowIR                           │
│           { nodes, edges, settings }                     │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Runtime Server                         │
│  ┌────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ BrowserPool│  │  Interpreter  │  │  Task Registry │   │
│  └────────────┘  └──────────────┘  └────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │              gRPC / REST API                      │    │
│  └──────────────────────────────────────────────────┘    │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
                  Streaming Events
            (task_started, step_started, ...)
```

## Package Boundaries

| Package | Responsibility |
|---------|---------------|
| `apps/runtime` | Runtime process composition, service startup |
| `apps/dashboard` | Web application for workflow management |
| `packages/workflow` | Shared `WorkflowIR` types, node definitions, events |
| `packages/workflow-builder` | Fluent TypeScript API for code-first authoring |
| `packages/compiler` | Build-time compilation, Vite plugin |
| `packages/runtime-loader` | Source resolution and IR validation |
| `packages/sdk` | gRPC client for runtime execution |
| `packages/ui` | Embeddable React authoring components |
| `packages/proto` | gRPC wire protocol definitions |
