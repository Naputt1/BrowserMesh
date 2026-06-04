# WorkflowIR Reference

WorkflowIR (Intermediate Representation) is the universal JSON graph format that all BrowserMesh workflows compile to. It is the only format the runtime engine executes.

## Top-Level Structure

```json
{
  "id": "my-workflow",
  "name": "My Workflow",
  "version": "1.0.0",
  "settings": {
    "timing": { "minDelayMs": 100, "maxDelayMs": 500 },
    "outputType": { "kind": "object", "fields": [] },
    "multiPage": false,
    "statePersistence": false
  },
  "nodes": [],
  "edges": []
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique workflow identifier |
| `name` | `string` | No | Human-readable name |
| `version` | `string` | No | Semantic version |
| `settings` | `object` | No | Global workflow settings |
| `nodes` | `Node[]` | Yes | Graph nodes (at least `start` + `end`) |
| `edges` | `Edge[]` | Yes | Graph edges connecting nodes |

## Node Schema

```json
{
  "id": "node-1",
  "type": "navigate",
  "label": "Go to homepage",
  "position": { "x": 100, "y": 200 },
  "config": {
    "url": "https://example.com"
  },
  "pageId": "page-1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique node ID within the workflow |
| `type` | `string` | Yes | One of the 25 [Node Types](/reference/node-types) |
| `label` | `string` | No | Display label for the node |
| `position` | `object` | No | Visual position on the canvas |
| `config` | `object` | No | Type-specific configuration |
| `pageId` | `string` | No | Associates the node with a page/tab |

## Edge Schema

```json
{
  "id": "e-1-2",
  "source": "node-1",
  "sourceHandle": "flow",
  "target": "node-2",
  "targetHandle": "flow"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | Yes | Unique edge ID |
| `source` | `string` | Yes | Source node ID |
| `sourceHandle` | `string` | Yes | Source pin name (`flow` or data pin name) |
| `target` | `string` | Yes | Target node ID |
| `targetHandle` | `string` | Yes | Target pin name (`flow` or data pin name) |

## Settings Schema

### GlobalSettings

```json
{
  "timing": {
    "minDelayMs": 100,
    "maxDelayMs": 500,
    "typingSpeed": "human",
    "requestJitter": true,
    "scrollSimulation": false,
    "randomMouseMovement": true,
    "idleWaits": false
  },
  "outputType": {
    "kind": "object",
    "fields": [
      { "name": "title", "type": { "kind": "string" } },
      { "name": "prices", "type": { "kind": "array", "elementType": { "kind": "string" } } }
    ]
  },
  "multiPage": false,
  "statePersistence": false
}
```

### TimingControls

| Field | Type | Description |
|-------|------|-------------|
| `minDelayMs` | `number` | Minimum delay between steps (ms) |
| `maxDelayMs` | `number` | Maximum delay between steps (ms) |
| `typingSpeed` | `string` | `instant`, `fast`, `human`, or `slow` |
| `requestJitter` | `boolean` | Randomize network request timing |
| `scrollSimulation` | `boolean` | Simulate human scrolling behavior |
| `randomMouseMovement` | `boolean` | Move mouse along natural curved paths |
| `idleWaits` | `boolean` | Insert random idle pauses |

### DataType

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `string` | `string`, `number`, `boolean`, `object`, or `array` |
| `name` | `string` | Optional name for the type |
| `fields` | `DataTypeField[]` | Fields (for `object` kind) |
| `elementType` | `DataType` | Element type (for `array` kind) |

## Complete Example

```json
{
  "id": "books-scraper",
  "name": "Books Scraper",
  "version": "1.0.0",
  "settings": {
    "timing": { "minDelayMs": 200, "maxDelayMs": 600 }
  },
  "nodes": [
    { "id": "start", "type": "start" },
    { "id": "nav", "type": "navigate", "config": { "url": "https://books.toscrape.com" } },
    { "id": "sel", "type": "select", "config": { "selector": "h1" } },
    { "id": "ext", "type": "extract", "config": { "mode": "text" } },
    { "id": "out", "type": "output" },
    { "id": "end", "type": "end" }
  ],
  "edges": [
    { "id": "e-start-nav", "source": "start", "sourceHandle": "flow", "target": "nav", "targetHandle": "flow" },
    { "id": "e-nav-sel", "source": "nav", "sourceHandle": "flow", "target": "sel", "targetHandle": "flow" },
    { "id": "e-sel-ext", "source": "sel", "sourceHandle": "flow", "target": "ext", "targetHandle": "flow" },
    { "id": "d-sel-ext", "source": "sel", "sourceHandle": "element", "target": "ext", "targetHandle": "element" },
    { "id": "e-ext-out", "source": "ext", "sourceHandle": "flow", "target": "out", "targetHandle": "flow" },
    { "id": "d-ext-out", "source": "ext", "sourceHandle": "value", "target": "out", "targetHandle": "value" },
    { "id": "e-out-end", "source": "out", "sourceHandle": "flow", "target": "end", "targetHandle": "flow" }
  ]
}
```

Note the distinction between flow edges (prefixed `e-`) and data edges (prefixed `d-`). Flow edges control execution order; data edges carry values between node pins.
