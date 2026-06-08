# @browsermesh/workflow-builder

The fluent TypeScript API for authoring workflows. Provides `createWorkflow()`, `PageBuilder`, `ElementHandle`, and supporting classes.

## Installation

```sh
pnpm add @browsermesh/sdk
```

## Exports

### createWorkflow()

Create a workflow from a builder function:

```typescript
function createWorkflow<TOutput = unknown, TState = unknown>(
  fn: (builder: WorkflowBuilder) => TOutput,
): WorkflowHandle<TOutput, TState>;
```

The builder function receives a `WorkflowBuilder` and returns a typed output object. The function is evaluated at build time by the compiler. The `TState` type parameter provides type-safe state access via `getState()` and `save()`.

### WorkflowBuilder

Top-level builder for constructing workflows:

```typescript
class WorkflowBuilder {
  createPage(label?: string): PageBuilder;
  addStartNode(): WorkflowNode;
  addEndNode(): WorkflowNode;
  getState(): TrackedValue;
  setState(value: TrackedValue | unknown): this;
  toIR(): WorkflowIR;
}
```

- `getState()` — Reads the persisted state value into the workflow data flow. Returns a `TrackedValue` that can be wired into `setState()` or other nodes.
- `setState(value)` — Persists a value back to the workflow state. Accepts either a literal JSON-serializable value or a `TrackedValue` from `getState()` (which creates a data edge for run-time wiring).

### WorkflowHandle

Returned by `createWorkflow()`. Provides runtime execution and state persistence:

```typescript
class WorkflowHandle<TOutput = unknown, TState = unknown> {
  getIR(): WorkflowIR | null;
  run(options?: { client?: RuntimeClient; taskId?: string }): Promise<TOutput>;
  getState(options?: { client?: RuntimeClient }): Promise<TState>;
  save(state: TState, options?: { client?: RuntimeClient; commit?: boolean }): Promise<void>;
}
```

The `TState` type parameter flows from `createWorkflow<TOutput, TState>()` and provides type-safe access to persisted workflow state between runs.

**Example — wiring state through the workflow:**

```typescript
import { createWorkflow } from '@browsermesh/sdk';
import { BrowserMeshClient } from '@browsermesh/sdk/node';

interface MyState { page: number; items: string[] }

const wf = createWorkflow<{ title: string }, MyState>((wf) => {
  // Read state at the start — creates a state node in the IR
  const state = wf.getState();

  const page = wf.createPage();
  page.navigate({ url: 'https://example.com' });
  const title = page.select({ selector: 'h1' }).text('title');

  // Write the state back at the end — wires state.value into set state node
  wf.setState(state);

  return { title };
});

const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });

// Get persisted state from previous run (via WorkflowHandle)
const state = await wf.getState({ client });
// state is typed as MyState

// Run the workflow
const result = await wf.run({ client });

// Save updated state for next run
await wf.save(
  { page: (state?.page ?? 0) + 1, items: [result.title] },
  { client, commit: true },
);
```

### PageBuilder

Page-level operations:

```typescript
class PageBuilder {
  navigate(params: { url: string }): this;
  click(params: { selector: string }): this;
  type(params: { selector: string; value: string }): this;
  wait(params: { ms?: number; selector?: string }): this;
  scroll(params: { selector?: string; direction?: 'up' | 'down' }): this;
  select(params: { selector: string }): ElementHandleSelector;
  fetch(params: { url: string }): TrackedValue;
  listen(): this;
}
```

### ElementHandleSelector

Fluent selector API returned by `PageBuilder.select()`:

```typescript
class ElementHandleSelector {
  text(name?: string): TrackedValue;
  html(name?: string): TrackedValue;
  attribute(name: string, key?: string): TrackedValue;
  value(name?: string): TrackedValue;
  selectAll(): LoopItems;
  click(): this;
  exists(): boolean;
}
```

### LoopItems

Iterable of element handles produced by `selectAll()`:

```typescript
class LoopItems {
  [Symbol.iterator](): Iterator<ElementHandle>;
}
```

### ElementHandle

Represents a single element within a loop:

```typescript
class ElementHandle {
  text(): TrackedValue;
  html(): TrackedValue;
  attribute(name: string): TrackedValue;
  value(): TrackedValue;
  click(): void;
}
```

### GraphBuilder

Low-level graph construction:

```typescript
class GraphBuilder {
  addNode(node: WorkflowNode): string;
  addEdge(edge: WorkflowEdge): string;
  connectFlow(from: string, to: string): string;
  createLoopScope(items: LoopItems): { body: (fn: () => void) => void };
}
```

### TrackedValue

Tracks extraction paths for output mapping:

```typescript
class TrackedValue {
  readonly id: string;
  readonly path: string[];
}
```

### createWorkflowLoader()

Lightweight loader for precompiled IR (re-exported from `@browsermesh/sdk`):

```typescript
function createWorkflowLoader<TOutput = unknown, TState = unknown>(
  ir: WorkflowIR,
  name?: string,
): WorkflowHandle<TOutput, TState>;
```

Used by the compiler's rewritten output to load sidecar IR files at runtime. Supports the same `getState()` / `save()` state methods from `WorkflowHandle` when a `TState` generic is provided.

### WorkflowOptions

```typescript
type WorkflowOptions = {
  id?: string;
  name?: string;
  version?: string;
  settings?: GlobalSettings;
};
```
