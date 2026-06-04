# Node Types Reference

BrowserMesh defines 25 node types organized into three categories: **Flow**, **Action**, and **Data**.

## Flow Nodes

Control the execution flow of the workflow graph.

### start

The entry point of every workflow. Must be the first node executed.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Output |

### end

Terminates workflow execution. Must be reachable from all execution paths.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |

### loop

Iterates over a collection of items. Creates a sub-graph scope for the loop body.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `items` | Data | Input | `array` |
| `flow` | Flow | Output (continue) | |
| `body` | Flow | Output (loop body) | |
| `index` | Data | Output | `number` |
| `item` | Data | Output | `any` |

### if

Conditional branch. Routes execution to the `true` or `false` output based on the boolean condition.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `condition` | Data | Input | `boolean` |
| `true` | Flow | Output | |
| `false` | Flow | Output | |

### switch

Multi-way branch. Routes execution to a case based on the input value.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `value` | Data | Input |
| `default` | Flow | Output |

### break

Exits the current loop early.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |

### continue

Skips to the next iteration of the current loop.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |

### state

Reads or writes global state within a workflow.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `value` | Data | Input |
| `flow` | Flow | Output |
| `value` | Data | Output |

## Action Nodes

Perform browser or network operations.

### navigate

Navigates a page to a URL.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `url` | Data | Input |
| `flow` | Flow | Output |

**Config:** `{ "url": string }`

### click

Clicks a DOM element.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `element` | Data | Input |
| `flow` | Flow | Output |

**Config:** `{ "selector": string }`

### type

Types text into a DOM element (e.g., an input field).

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `element` | Data | Input |
| `flow` | Flow | Output |

**Config:** `{ "selector": string, "value": string }`

### wait

Waits for a specified duration or for a DOM element to appear.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `flow` | Flow | Output |

**Config:** `{ "ms"?: number, "selector"?: string }`

### scroll

Scrolls the page or a specific element.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `element` | Data | Input |
| `flow` | Flow | Output |

**Config:** `{ "selector"?: string, "direction"?: "up" | "down" }`

### custom

Executes a custom handler registered on the runtime. Extensibility point for application-specific logic.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `flow` | Flow | Output |

**Config:** `{ "handler": string, ...customFields }`

### fetch

Makes an HTTP request (not via the browser page).

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `pageKey` | Data | Input | |
| `url` | Data | Input | |
| `flow` | Flow | Output | |
| `response` | Data | Output | `object` |

**Config:** `{ "url": string, "method"?: string, "headers"?: object, "body"?: string }`

### listen

Captures network requests made by the browser page.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `flow` | Flow | Output | |
| `requests` | Data | Output | `array<object>` |

### page

Creates or switches to a browser page or tab. Enables multi-page workflows.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `flow` | Flow | Output | |
| `pageKey` | Data | Output | `string` |

**Config:** `{ "action": "create" | "switch" | "close", "pageKey"?: string }`

## Data Nodes

Extract, transform, and combine data.

### select

Selects a DOM element from the page. Outputs an element reference suitable for extraction or further interaction.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `element` | Data | Input |
| `flow` | Flow | Output |
| `element` | Data | Output |

**Config:** `{ "selector": string }`

### extract

Extracts text, HTML, attribute, or value from a selected DOM element.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `pageKey` | Data | Input |
| `element` | Data | Input |
| `flow` | Flow | Output |
| `value` | Data | Output |

**Config:** `{ "mode": "text" | "html" | "attribute" | "value", "attributeName"?: string }`

### output

Accumulates a value into the workflow's final output.

| Pin | Type | Direction |
|-----|------|-----------|
| `flow` | Flow | Input |
| `value` | Data | Input |
| `index` | Data | Input |
| `flow` | Flow | Output |

### compare

Compares two values. Outputs a boolean result.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `left` | Data | Input | `any` |
| `right` | Data | Input | `any` |
| `flow` | Flow | Output | |
| `result` | Data | Output | `boolean` |

### and

Boolean AND of two inputs.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `a` | Data | Input | `boolean` |
| `b` | Data | Input | `boolean` |
| `flow` | Flow | Output | |
| `result` | Data | Output | `boolean` |

### or

Boolean OR of two inputs.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `a` | Data | Input | `boolean` |
| `b` | Data | Input | `boolean` |
| `flow` | Flow | Output | |
| `result` | Data | Output | `boolean` |

### not

Boolean NOT of a single input.

| Pin | Type | Direction | Data Type |
|-----|------|-----------|-----------|
| `flow` | Flow | Input | |
| `value` | Data | Input | `boolean` |
| `flow` | Flow | Output | |
| `result` | Data | Output | `boolean` |

## Summary

| Node | Category | Color | Inputs | Outputs |
|------|----------|-------|--------|---------|
| start | flow | gray | — | flow |
| end | flow | gray | flow | — |
| navigate | action | blue | flow, pageKey, url | flow |
| click | action | green | flow, pageKey, element | flow |
| type | action | amber | flow, pageKey, element | flow |
| wait | action | purple | flow, pageKey | flow |
| scroll | action | slate | flow, pageKey, element | flow |
| select | data | teal | flow, pageKey, element | flow, element |
| extract | data | teal | flow, pageKey, element | flow, value |
| output | data | teal | flow, value, index | flow |
| loop | flow | orange | flow, items | flow, body, index, item |
| if | flow | amber | flow, condition | true, false |
| switch | flow | purple | flow, value | default |
| break | flow | red | flow | — |
| continue | flow | emerald | flow | — |
| state | flow | cyan | flow, value | flow, value |
| page | action | sky | flow | flow, pageKey |
| fetch | action | violet | flow, pageKey, url | flow, response |
| listen | action | pink | flow | flow, requests |
| custom | action | gray | flow | flow |
| compare | data | indigo | flow, left, right | flow, result |
| and | data | cyan | flow, a, b | flow, result |
| or | data | amber | flow, a, b | flow, result |
| not | data | pink | flow, value | flow, result |
