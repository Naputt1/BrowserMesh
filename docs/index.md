# BrowserMesh

A unified browser automation platform where workflows compile to a JSON execution graph for deterministic execution.

Workflows can be authored in TypeScript (fluent API), a visual node editor (React UI), or precompiled JSON — all paths compile to a single **WorkflowIR** graph format. The runtime engine exclusively executes compiled JSON, never TypeScript or node graphs directly.

```
TypeScript API ──┐
Visual Builder ──┼──► WorkflowIR ──► Runtime Engine ──► Streaming Events
Remote JSON   ──┘
```

## When to Use BrowserMesh

- **Browser automation as infrastructure** — treat workflows as a compilation target, not executable scripts
- **Deterministic execution** — all operations are explicit graph nodes; no hidden side effects
- **Portable format** — author anywhere (code, visual editor, JSON), execute anywhere (local, Docker, Kubernetes)
- **Streaming observability** — real-time task progress, logs, screenshots, and partial data

## Key Features

- **Code-first authoring** — fluent TypeScript API with `createWorkflow()`, type-driven extraction mapping, and loop/condition support
- **Visual authoring** — embeddable React components (`<WorkflowBuilder />`) with canvas, browser preview, and DOM selector picker
- **Build-time compilation** — Vite plugin detects `createWorkflow()` calls, compiles them to `.ir.json` sidecar files
- **Runtime server** — standalone gRPC/REST server using Playwright, with browser pooling, stealth mode, and human-like timing controls
- **Multi-source loading** — resolve workflows from URLs, S3, local files, inline JSON, or compiled sidecars
- **25 node types** — navigate, click, type, select, extract, loop, conditionals, fetch, listen, state, page/tab management, and more

## Packages

| Package | Description |
|---------|-------------|
| `@browsermesh/sdk` | Unified SDK — types, workflow builder, runtime client, source resolution |
| `@browsermesh/compiler` | Vite plugin + build-time compiler: TS → `.ir.json` sidecar |
| `@browsermesh/ui` | Embeddable React components for visual workflow authoring |
| `apps/runtime` | Standalone gRPC/REST runtime server (Playwright-based) |
| `apps/dashboard` | Dashboard application |

## Quick Links

- [Getting Started](/guide/getting-started)
- [Core Concepts](/guide/core-concepts)
- [Architecture Overview](/architecture/overview)
- [GitHub](https://github.com/anomalyco/BrowserMesh)
