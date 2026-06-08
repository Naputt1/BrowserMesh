# @browsermesh/runtime-loader

Universal source resolution for workflow IR files. Loads workflows from URLs, S3, local files, inline JSON, or compiled sidecars — all converging to validated `WorkflowIR`.

This package is re-exported via `@browsermesh/sdk/node` — most consumers should import from there instead.

## Installation

```sh
pnpm add @browsermesh/sdk
```

## Exports

### resolveWorkflow()

Resolve any supported source type to a validated `WorkflowIR`:

```typescript
function resolveWorkflow(source: WorkflowSource): Promise<WorkflowIR>;
```

Supports the following source types:

| Source Type | Example |
|-------------|---------|
| Compiled sidecar | `workflow.run()` (uses embedded IR) |
| Remote URL | `resolveWorkflow('https://cdn.example.com/wf.json')` |
| S3 bucket | `resolveWorkflow({ type: 's3', bucket: 'my-bucket', key: 'wf.json' })` |
| Inline object | `resolveWorkflow({ type: 'inline', ir: { id: '...', nodes: [], edges: [] } })` |
| Local file | `resolveWorkflow('./workflow.ir.json')` |
| JSON string | `resolveWorkflow('{"id":"...","nodes":[],"edges":[]}')` |
| Direct object | `resolveWorkflow({ id: '...', nodes: [], edges: [] })` |

### validateWorkflowIR()

Validate a `WorkflowIR` object for structural correctness:

```typescript
function validateWorkflowIR(ir: unknown): WorkflowIR;
```

Throws `WorkflowValidationError` if:
- Required fields are missing
- Unknown node types are used
- Edge references reference non-existent nodes or handles
- Graph contains cycles (where not allowed)

### loadWorkflowDir()

Load all workflow IR files from a directory:

```typescript
function loadWorkflowDir(dirPath: string): Promise<WorkflowManifest>;
```

### loadWorkflowManifest()

Load a `workflows-manifest.json` and resolve all referenced workflows:

```typescript
function loadWorkflowManifest(manifestPath: string): Promise<WorkflowManifest>;
```

### Types

```typescript
type WorkflowSource =
  | string                                    // URL, local path, or JSON string
  | { type: 's3'; bucket: string; key: string; region?: string }
  | { type: 'url'; url: string }
  | { type: 'inline'; ir: WorkflowIR }
  | WorkflowIR;

type ManifestEntry = {
  id: string;
  name?: string;
  path: string;
};

type WorkflowManifest = {
  entries: ManifestEntry[];
};

class WorkflowValidationError extends Error {
  code: string;
  details: string[];
}
```
