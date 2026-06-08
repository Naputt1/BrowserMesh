# Authoring Workflows

BrowserMesh supports three authoring paths. All produce the same `WorkflowIR` format.

## 1. Code-First (TypeScript API)

The fluent TypeScript API provides type-safe workflow construction with full IDE support.

```typescript
import { createWorkflow } from '@browsermesh/sdk';

const workflow = createWorkflow<{ title: string }>((wf) => {
  const page = wf.createPage().navigate({ url: 'https://example.com' });

  const title = page.select({ selector: 'h1' }).text('title');

  return { title };
});
```

### Key Abstractions

| Class | Role |
|-------|------|
| `WorkflowBuilder` | Top-level builder, creates pages and manages output |
| `PageBuilder` | Page-level operations: navigate, click, type, select, etc. |
| `ElementHandle` | Represents a selected DOM element |
| `ElementHandleSelector` | Fluent selector: `.text()`, `.selectAll()`, `.click()` |
| `GraphBuilder` | Low-level graph construction (addNode, addEdge) |
| `TrackedValue` | Tracks output paths for extraction mapping |

### Loops

```typescript
const workflow = createWorkflow<{ prices: string[] }>((wf) => {
  const page = wf.createPage().navigate({ url: 'https://books.toscrape.com' });

  const items = page.select({ selector: '.price_color' }).selectAll();
  const prices: string[] = [];

  for (const item of items) {
    prices.push(item.text());
  }

  return { prices };
});
```

### Conditions

```typescript
if (page.select({ selector: '.error' }).exists()) {
  // handle error
}
```

## 2. Visual (React UI)

The `@browsermesh/ui` package provides embeddable React components for drag-and-drop workflow authoring.

```tsx
import { WorkflowBuilder } from '@browsermesh/ui';

function App() {
  return (
    <WorkflowBuilder
      workflows={[]}
      onCompile={(ir) => console.log('compiled', ir)}
    />
  );
}
```

### Available Components

| Component | Purpose |
|-----------|---------|
| `WorkflowBuilder` | Top-level editor with toolbar, canvas, config panels |
| `WorkflowCanvas` | React Flow-based graph editor with drag-drop, connection, copy/paste |
| `BrowserPane` | Embedded browser preview |
| `SelectorOverlay` | DOM element selector picker |
| `ExtractionMapper` | Visual extraction mapping with type-driven scopes |
| `DevtoolsPanel` | DevTools-style panels (console, network, DOM) |
| `TaskConsole` | Streamed task event viewer |
| `Toolbar` | Workflow actions (undo/redo, import/export, run) |
| `NodeConfigPanel` | Configure selected node properties |
| `GlobalSettingsPanel` | Configure workflow-level settings |

## 3. Precompiled JSON

Write raw `WorkflowIR` JSON directly for maximum portability:

```json
{
  "id": "my-workflow",
  "nodes": [
    { "id": "1", "type": "start" },
    { "id": "2", "type": "navigate", "config": { "url": "https://example.com" } },
    { "id": "3", "type": "end" }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "sourceHandle": "flow", "target": "2", "targetHandle": "flow" },
    { "id": "e2-3", "source": "2", "sourceHandle": "flow", "target": "3", "targetHandle": "flow" }
  ]
}
```

Load with the runtime loader:

```typescript
import { resolveWorkflow } from '@browsermesh/sdk/node';

const ir = await resolveWorkflow('https://cdn.example.com/workflow.json');
```

## Choosing an Approach

| Approach | Best for |
|----------|----------|
| Code-first | Developers, CI/CD pipelines, version-controlled workflows |
| Visual | Non-technical users, rapid prototyping, debugging |
| Precompiled JSON | Dynamic sources (S3, CDN), generated workflows, cross-platform distribution |
