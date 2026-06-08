# Monorepo Setup

Add BrowserMesh packages to an existing pnpm monorepo.

## Prerequisites

- pnpm workspace with `pnpm-workspace.yaml`
- TypeScript 5.8+
- Node.js 20+

## 1. Add Packages

```sh
# Unified SDK — workflow builder, types, runtime client, source resolution
pnpm add @browsermesh/sdk

# Build-time compiler (dev dependency)
pnpm add -D @browsermesh/compiler
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
import { createWorkflow } from '@browsermesh/sdk';

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
import { BrowserMeshClient } from '@browsermesh/sdk/node';
import { workflow } from './src/workflows/example';

const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });
const result = await workflow.run({ client });
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
