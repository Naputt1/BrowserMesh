# Data Flow

How data moves through the BrowserMesh system, from authoring to execution.

## Authoring → Compilation

### Code-First Path

```
TypeScript Source ──► Vite Plugin ──► IR JSON ──► Rewritten Source
                        │                              │
                        ▼                              ▼
                  .ir.json sidecar             createWorkflowLoader()
```

1. Developer writes a `createWorkflow()` call with a builder function
2. Vite plugin detects the call, extracts the function body
3. A temporary module evaluates the builder, producing the `WorkflowIR` JSON
4. The IR is written to a `.ir.json` sidecar file
5. The source is rewritten to import the sidecar and use `createWorkflowLoader()`

### Visual Path

```
React UI ──► workflo─ ──► IR JSON
                  wConverter
```

1. User drags nodes onto the React Flow canvas
2. `workflow-converter.ts` transforms the canvas state into `WorkflowIR`
3. The IR can be exported as JSON or passed to the compiler

### JSON Path

```
JSON File ──► resolveWorkflow() ──► Validated WorkflowIR
   │
   ▼
URL / S3 / Inline
```

1. Raw JSON is loaded from any supported source
2. `resolveWorkflow()` validates the structure
3. Returns a `WorkflowIR` ready for execution

## Compilation → Execution

```
WorkflowIR ──► gRPC/REST ──► Runtime Interpreter
                 │
                 ▼
         BrowserPool ──► Playwright ──► Browser
```

1. The IR is sent to the runtime via `ExecuteWorkflow` RPC (serialized as JSON)
2. The interpreter acquires a browser page from the pool
3. The interpreter walks the graph: for each node, it dispatches to the appropriate handler
4. Handlers interact with the browser via Playwright

## Execution → Events

```
Interpreter ──► Node Handler ──► Event ──► Stream ──► Client
```

As each node executes, the handler yields events:

1. **Navigation** → `step_started` (navigate), then `step_completed`
2. **Selection** → `step_started` (select), element reference passed as data to next node
3. **Extraction** → `step_started` (extract), `partial_data` (with path + value), `step_completed`
4. **Loop iteration** → `progress` (with completed/total counts)
5. **Completion** → `task_completed` (with final result) or `task_failed` (with error)

## Data Flow Within the Graph

Data moves between nodes through data edges:

```
                        Data Edge
Navigate ──flow──► Select ──flow──► Extract ──flow──► Output
                      │               │
                      └──element──────┘
                                     │
                                     └──value──────┘
```

- **Flow edges** (solid) determine execution order
- **Data edges** (dashed) carry values between node pins
- A node starts executing when it receives flow; it reads data from its data input pins
- When done, it sends flow to the next node and writes data to its data output pins

## Streaming Events

Events are streamed back to the client in real-time via gRPC server-streaming:

```
Client                    Runtime
  │                         │
  ├──── ExecuteWorkflow ───►│
  │                         ├── task_started ────►
  │                         ├── step_started ────►
  │                         ├── step_completed ──►
  │                         ├── partial_data ────►
  │                         ├── progress ────────►
  │                         ├── task_completed ──►
  │                         │
```

The client can also send cancellation, pause, or resume commands during execution.
