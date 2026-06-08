# Design Principles

BrowserMesh is built around five core design principles.

## 1. No Arbitrary JS Execution

Workflows use only explicit, predefined primitives. There is no `eval()`, no dynamic code generation, and no way to inject arbitrary JavaScript into a running workflow.

**Why:** Execution must be safe, auditable, and deterministic. If a workflow can execute arbitrary code, it becomes impossible to reason about its behavior, and the runtime cannot guarantee isolation between workflows.

**What this means:**
- All operations are visible as nodes in the graph
- The runtime can validate a workflow's behavior before executing it
- Workflows can be safely executed in multi-tenant environments
- Audit trails show exactly what happened, step by step

## 2. No Hidden Side Effects

Every operation that a workflow performs must be explicitly represented as a node in the graph.

**Why:** Hidden side effects make workflows unpredictable and hard to debug. If clicking a button could trigger arbitrary network requests, state mutations, or navigations that aren't visible in the graph, the workflow's behavior becomes opaque.

**What this means:**
- Browser automation operations (click, type, navigate) are explicit nodes
- Network requests (fetch, listen) are explicit nodes
- State mutations (state node) are explicit
- Custom handlers are registered upfront and visible in the graph as `custom` nodes

## 3. Deterministic Control Flow

Loops, conditions, and branches are represented as explicit graph nodes rather than relying on language-level control flow.

**Why:** Language-level control flow (e.g., `for` loops, `if` statements in a script) is invisible to the runtime. By making control flow nodes explicit, the runtime can track execution position, persist state between steps, and resume interrupted workflows.

**What this means:**
- `loop` nodes create explicit sub-graph scopes with body, continue, and break paths
- `if` nodes have explicit `true` and `false` output paths
- `switch` nodes route to explicit case outputs
- The interpreter can serialize and resume execution at any point in the graph

## 4. Portable Execution Format

Workflows are compiled to a portable JSON format (`WorkflowIR`) that can be authored anywhere and executed anywhere.

**Why:** Tying workflow authoring to execution limits portability. The same workflow should run identically whether it was authored in TypeScript, a visual editor, or written directly as JSON.

**What this means:**
- The runtime never imports TypeScript modules
- Workflows can be distributed via CDN, S3, or embedded directly
- The same IR file runs in Docker, Kubernetes, or embedded as a library
- Workflow sources can be swapped without changing the runtime

## 5. Source-Agnostic Runtime

The runtime engine has no knowledge of how a workflow was authored. It only knows how to execute `WorkflowIR`.

**Why:** The runtime should be a pure execution engine. If it depended on any authoring path, changing the authoring experience would require changing the runtime, and vice versa.

**What this means:**
- The `@browsermesh/sdk` package (the IR contract and runtime client) is the only shared dependency between authoring and execution
- The compiler, visual editor, and JSON sources are completely independent of the runtime
- New authoring paths can be added without modifying the runtime
- The runtime can be developed and deployed independently of the authoring tools

## Non-Goals

BrowserMesh does not implement:

- **Authentication** — clients handle their own auth
- **Persistence** — no built-in workflow storage or database
- **Hosted workflow storage** — workflows are compiled to files, not stored in a managed service
- **Scheduling or orchestration** — no cron, queues, or DAG schedulers
- **Billing** — no usage tracking or metering
- **Team management** — no multi-user permissions or workspaces
- **Multi-user application logic** — all such concerns belong to products built on top of BrowserMesh
