# Core Concepts

## WorkflowIR

Every BrowserMesh workflow is a JSON graph called **WorkflowIR** (Intermediate Representation). It is the universal format that all authoring paths target and the runtime exclusively executes.

```typescript
type WorkflowIR = {
  id: string;
  name?: string;
  version?: string;
  settings?: GlobalSettings;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
```

### Nodes

A node represents a single operation: navigate to a URL, click an element, evaluate a condition, etc.

```typescript
type WorkflowNode = {
  id: string;
  type: NodeType;
  label?: string;
  position?: { x: number; y: number };
  config?: Record<string, unknown>;
  pageId?: string;
};
```

Each node has input pins (flow + data) and output pins (flow + data). Pins determine what connects to what.

### Edges

An edge connects an output pin of one node to an input pin of another:

```typescript
type WorkflowEdge = {
  id: string;
  source: string;        // source node ID
  sourceHandle: string;  // output pin name
  target: string;        // target node ID
  targetHandle: string;  // input pin name
};
```

There are two types of pins:
- **Flow pins** — control flow (execution order). All nodes have at least one flow input and one flow output, except `start` (no inputs) and `end`/`break`/`continue` (no outputs).
- **Data pins** — pass values between nodes (strings, numbers, booleans, objects, arrays).

## Node Categories

The 25 node types are organized into four categories:

| Category | Nodes |
|----------|-------|
| **Flow** | `start`, `end`, `loop`, `if`, `switch`, `break`, `continue`, `state` |
| **Action** | `navigate`, `click`, `type`, `wait`, `scroll`, `custom`, `fetch`, `listen`, `page` |
| **Data** | `select`, `extract`, `output`, `compare`, `and`, `or`, `not` |

## Execution Model

1. The interpreter starts at the `start` node and follows flow edges.
2. Each node executes synchronously. When it completes, flow passes to the next node.
3. Data edges carry values between nodes (e.g., a `select` node outputs an element reference that an `extract` node reads).
4. `loop` nodes create a sub-graph scope. The body path is executed once per item.
5. `if` nodes branch: the `true` output is taken when the condition is truthy, otherwise `false`.
6. The runtime streams events for every step: started, completed, logs, screenshots, progress, and final result.

## Key Principles

- **No arbitrary JS execution** — workflows use only explicit primitives. No `eval`, no dynamic code.
- **No hidden side effects** — every operation is a visible node in the graph.
- **Deterministic control flow** — loops, conditions, and branches are explicit graph nodes, not language constructs.
- **Source-agnostic runtime** — the runtime never knows how the workflow was authored (code, UI, or JSON).

## Timing Controls

Workflows can simulate human behavior via `TimingControls`:

| Setting | Description |
|---------|-------------|
| `minDelayMs` / `maxDelayMs` | Random delay range between steps |
| `typingSpeed` | `instant`, `fast`, `human`, `slow` |
| `requestJitter` | Randomize request timing |
| `scrollSimulation` | Simulate human scrolling |
| `randomMouseMovement` | Move mouse along random paths |
| `idleWaits` | Insert random idle pauses |
