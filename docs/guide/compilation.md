# Compilation

BrowserMesh uses a **build-time compilation** model. TypeScript workflow definitions are evaluated at build time, producing a JSON sidecar (`.ir.json`) that the runtime executes. The TypeScript source is rewritten to load the precompiled IR instead of calling `createWorkflow()` at runtime.

## Why Build-Time Compilation?

- **No runtime overhead** — the builder function runs once at build time, not every time the workflow executes
- **Deterministic output** — the compiled IR is a static JSON file that can be inspected, versioned, and cached
- **Smaller bundles** — the workflow-builder code is not needed at runtime (only the lightweight loader from `@browsermesh/sdk`)
- **Portability** — compiled IR files can be served from any CDN, S3 bucket, or file system

## How It Works

The `@browsermesh/compiler` package provides a Vite plugin that hooks into the build pipeline:

1. **Detection** — scans source files for `createWorkflow()` calls using regex extraction
2. **Evaluation** — writes a temporary wrapper module that imports the source, executes `createWorkflow()`, extracts the IR JSON, and writes it to a `.ir.json` sidecar file
3. **Rewriting** — replaces the `createWorkflow()` call with a `createWorkflowLoader()` call that imports the sidecar

### Before compilation:

```typescript
// src/workflows/scrape.ts
import { createWorkflow } from '@browsermesh/sdk';

export const workflow = createWorkflow<{ title: string }>((wf) => {
  // ... builder logic
  return { title };
});
```

### After compilation:

```typescript
// src/workflows/scrape.ts (rewritten)
import __ir from './scrape.ir.json';
import { createWorkflowLoader } from '@browsermesh/sdk';

export const workflow = createWorkflowLoader(__ir);
```

A sidecar file `scrape.ir.json` is emitted alongside the compiled JavaScript.

## Vite Plugin Setup

```typescript
// vite.config.ts
import { browsermesh } from '@browsermesh/compiler';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    browsermesh({
      include: ['src/workflows/**/*.ts'],
      outDir: 'dist/workflows',
    }),
  ],
});
```

### Plugin Options

```typescript
type BrowserMeshCompilerOptions = {
  include?: string[];  // glob patterns to match workflow files
  exclude?: string[];  // glob patterns to exclude
  outDir?: string;     // output directory for .ir.json files
};
```

## Standalone Compilation

Use the compiler API directly without Vite:

```typescript
import { compileSource, compileFile } from '@browsermesh/compiler';

// Compile from source string
const result = await compileSource(`
import { createWorkflow } from '@browsermesh/sdk';
  const wf = createWorkflow((b) => {
    const p = b.createPage().navigate({ url: 'https://example.com' });
    return {};
  });
`);

// Compile a file
await compileFile('src/workflows/scrape.ts', { outDir: 'dist/workflows' });
```

### Extraction Utilities

```typescript
import { extractWorkflow, rewriteSource, getIrFilename } from '@browsermesh/compiler';

// Extract createWorkflow() calls from source
const extracted = extractWorkflow(sourceCode);

// Rewrite source to use loader
const rewritten = rewriteSource(sourceCode, './scrape.ir.json');

// Get sidecar filename
const irFile = getIrFilename('scrape.ts'); // -> 'scrape.ir.json'
```

## Manifest Generation

When compiling multiple workflows, the plugin generates a `workflows-manifest.json` that maps workflow IDs to their IR file paths. This manifest can be loaded at runtime by the dashboard server or custom applications.
