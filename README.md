# BrowserMesh

BrowserMesh is a modular browser automation platform split into two independent layers:

- **BrowserMesh Runtime**: a standalone, stateless gRPC browser execution service.
- **BrowserMesh UI**: an embeddable React component library for workflow authoring, inspection, and extraction mapping.

BrowserMesh intentionally does **not** provide authentication, persistence, orchestration, workflow storage, billing, scheduling, team management, or multi-user application logic. Those responsibilities belong to the client application.

## Packages

- `apps/runtime`: Node/TypeScript gRPC runtime service for workflow execution and browser orchestration.
- `packages/proto`: canonical `.proto` definitions for BrowserMesh APIs.
- `packages/workflow`: shared workflow, extraction, timing, and streaming event contracts.
- `packages/sdk`: TypeScript client SDK for connecting to the runtime and consuming streams.
- `packages/ui`: embeddable React component library for visual workflow authoring.

## Development

This repository uses `pnpm` workspaces and Turbo.

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Current Status

This is the initial architecture and package scaffold. Runtime behavior, generated gRPC clients, UI implementation, browser pooling, and execution logic are intentionally left for later implementation phases.

