# Monorepo Setup

Add BrowserMesh packages to an existing pnpm monorepo.

## Prerequisites

- pnpm workspace with `pnpm-workspace.yaml`
- TypeScript 5.8+
- Node.js 20+

## 1. Add Packages

```sh
# Core types
pnpm add @browsermesh/workflow

# Code-first authoring (dev dependency — compiled away at build time)
pnpm add -D @browsermesh/workflow-builder

# Build-time compiler (dev dependency)
pnpm add -D @browsermesh/compiler

# Runtime source resolution
pnpm add @browsermesh/runtime-loader

# gRPC client SDK
pnpm add @browsermesh/sdk
```

## 2. Configure the Vite Plugin

If using Vite, add the BrowserMesh compiler plugin:

```typescript
// vite.config.ts
import { browsermesh } from '@browsermesh/compiler';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    browsermesh({
      include: ['src/workflows/**/*.ts'],
    }),
  ],
});
```

## 3. Define Your First Workflow

```typescript
// src/workflows/example.ts
import { createWorkflow } from '@browsermesh/workflow-builder';

export const workflow = createWorkflow<{ message: string }>((wf) => {
  const page = wf.createPage().navigate({ url: 'https://example.com' });
  const title = page.select({ selector: 'h1' }).text('message');
  return { message: title.get() };
});
```

## 4. Build

```sh
pnpm build
```

The compiler will:
1. Detect `createWorkflow()` calls
2. Evaluate them at build time
3. Emit `.ir.json` sidecar files
4. Rewrite source to use `createWorkflowLoader()`

## 5. Execute

```typescript
import { workflow } from './src/workflows/example';

const result = await workflow.run({ endpoint: 'localhost:50051' });
console.log(result);
```

## TypeScript Configuration

Ensure your `tsconfig.json` includes `resolveJsonModule` for `.ir.json` imports:

```json
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "moduleResolution": "Bundler"
  }
}
```
