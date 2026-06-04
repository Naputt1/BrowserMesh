# @browsermesh/workflow

The `@browsermesh/workflow` package defines the core types and contracts shared across all packages. It is the single source of truth for the `WorkflowIR` format, node definitions, and event types.

## Installation

```sh
pnpm add @browsermesh/workflow
```

## Types

### WorkflowIR

The universal workflow representation:

```typescript
type WorkflowIR = WorkflowDefinition;

type WorkflowDefinition = {
  id: string;
  name?: string;
  version?: string;
  settings?: GlobalSettings;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};
```

### WorkflowNode

A single operation in the workflow graph:

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

### WorkflowEdge

A connection between two nodes:

```typescript
type WorkflowEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
};
```

### NodeType

```typescript
type NodeType =
  | 'start' | 'end' | 'navigate' | 'click' | 'type' | 'wait' | 'scroll'
  | 'select' | 'extract' | 'output' | 'loop' | 'custom' | 'fetch'
  | 'listen' | 'state' | 'page' | 'if' | 'switch' | 'and' | 'or'
  | 'not' | 'break' | 'compare' | 'continue';
```

### NodeTypeDefinition

Metadata for each node type:

```typescript
type NodeTypeDefinition = {
  type: NodeType;
  label: string;
  color: string;
  category: 'flow' | 'action' | 'data';
  inputs: PinDescriptor[];
  outputs: PinDescriptor[];
};
```

Access all definitions via the `NODE_DEFINITIONS` record.

### GlobalSettings

```typescript
type GlobalSettings = {
  timing?: TimingControls;
  outputType?: DataType;
  multiPage?: boolean;
  statePersistence?: boolean;
};
```

### TimingControls

```typescript
type TimingControls = {
  minDelayMs?: number;
  maxDelayMs?: number;
  typingSpeed?: 'instant' | 'fast' | 'human' | 'slow';
  requestJitter?: boolean;
  scrollSimulation?: boolean;
  randomMouseMovement?: boolean;
  idleWaits?: boolean;
};
```

### DataType

Describes the shape of data flowing through a workflow:

```typescript
type DataType = {
  kind: 'string' | 'number' | 'boolean' | 'object' | 'array';
  name?: string;
  fields?: DataTypeField[];
  elementType?: DataType;
};

type DataTypeField = {
  name: string;
  type: DataType;
};
```

### WorkflowEvent

Union type of all events emitted during workflow execution:

```typescript
type WorkflowEvent =
  | TaskStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | PartialDataEvent
  | LogEvent
  | ScreenshotEvent
  | ProgressEvent
  | TaskCompletedEvent
  | TaskFailedEvent;
```

See the [Events reference](/reference/events) for full field definitions.

## Constants

### NODE_DEFINITIONS

A `Record<NodeType, NodeTypeDefinition>` describing every node type's label, color, category, and input/output pins.

### CATEGORIES

```typescript
const CATEGORIES = [
  { value: 'flow', label: 'Flow' },
  { value: 'action', label: 'Actions' },
  { value: 'data', label: 'Data' },
] as const;
```
