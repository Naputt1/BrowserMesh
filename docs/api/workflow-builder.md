# @browsermesh/workflow-builder

The fluent TypeScript API for authoring workflows. Provides `createWorkflow()`, `PageBuilder`, `ElementHandle`, and supporting classes.

## Installation

```sh
pnpm add @browsermesh/workflow-builder
```

## Exports

### createWorkflow()

Create a workflow from a builder function:

```typescript
function createWorkflow<TOutput>(
  fn: (builder: WorkflowBuilder) => TOutput,
  options?: WorkflowOptions,
): WorkflowHandle;
```

The builder function receives a `WorkflowBuilder` and returns a typed output object. The function is evaluated at build time by the compiler.

### WorkflowBuilder

Top-level builder for constructing workflows:

```typescript
class WorkflowBuilder {
  createPage(label?: string): PageBuilder;
  addStartNode(): WorkflowNode;
  addEndNode(): WorkflowNode;
  toIR(): WorkflowIR;
}
```

### WorkflowHandle

Returned by `createWorkflow()`. Provides runtime execution:

```typescript
class WorkflowHandle {
  readonly ir: WorkflowIR;
  run(options?: { endpoint?: string; source?: WorkflowSource }): Promise<unknown>;
  toJSON(): WorkflowIR;
}
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

Lightweight loader for precompiled IR:

```typescript
function createWorkflowLoader(ir: WorkflowIR): WorkflowHandle;
```

Used by the compiler's rewritten output to load sidecar IR files at runtime.

### WorkflowOptions

```typescript
type WorkflowOptions = {
  id?: string;
  name?: string;
  version?: string;
  settings?: GlobalSettings;
};
```
