# @browsermesh/compiler

Build-time compiler that transforms TypeScript workflow definitions into compiled `.ir.json` sidecar files. Includes a Vite plugin for seamless integration.

## Installation

```sh
pnpm add -D @browsermesh/compiler
```

## Exports

### browsermesh() (Vite Plugin)

```typescript
function browsermesh(options?: BrowserMeshCompilerOptions): Plugin;
```

Integrates with the Vite build pipeline:

```typescript
// vite.config.ts
import { browsermesh } from '@browsermesh/compiler';

export default defineConfig({
  plugins: [
    browsermesh({
      include: ['src/workflows/**/*.ts'],
      exclude: ['**/*.test.ts'],
      outDir: 'dist/workflows',
    }),
  ],
});
```

### BrowserMeshCompilerOptions

```typescript
type BrowserMeshCompilerOptions = {
  include?: string[];
  exclude?: string[];
  outDir?: string;
};
```

### compileSource()

Compile a TypeScript source string containing `createWorkflow()` calls:

```typescript
function compileSource(
  source: string,
  options?: { filename?: string },
): Promise<CompiledWorkflow[]>;
```

### compileFile()

Compile a single TypeScript file:

```typescript
function compileFile(
  filePath: string,
  options?: { outDir?: string },
): Promise<CompiledWorkflow[]>;
```

### extractWorkflow()

Extract `createWorkflow()` calls from TypeScript source using regex:

```typescript
function extractWorkflow(source: string): ExtractResult[];
```

### rewriteSource()

Rewrite a TypeScript source to replace `createWorkflow()` with `createWorkflowLoader()`:

```typescript
function rewriteSource(source: string, irPath: string): string;
```

### getIrFilename()

Get the sidecar filename for a given source filename:

```typescript
function getIrFilename(sourceFile: string): string;
// getIrFilename('scrape.ts') -> 'scrape.ir.json'
```

### CompiledWorkflow

```typescript
type CompiledWorkflow = {
  id: string;
  irFile: string;
  ir: WorkflowIR;
};

type ExtractResult = {
  start: number;
  end: number;
  code: string;
};
```
