# Getting Started

## Prerequisites

- Node.js 20+
- pnpm 10+

## Installation

Clone the repository and install dependencies:

```sh
git clone https://github.com/anomalyco/BrowserMesh.git
cd BrowserMesh
pnpm install
```

Type-check and run tests:

```sh
pnpm typecheck
pnpm test
```

## Build All Packages

```sh
pnpm build
```

## Your First Workflow

Create a `scrape.ts` file:

```typescript
import { createWorkflow } from '@browsermesh/sdk';

const workflow = createWorkflow<{ title: string; prices: string[] }>((wf) => {
  const page = wf.createPage().navigate({ url: 'https://books.toscrape.com' });

  const title = page.select({ selector: 'h1' }).text('title');

  const items = page.select({ selector: '.product_pod .price_color' }).selectAll();

  const output: { title: string; prices: string[] } = { title: '', prices: [] };

  for (const item of items) {
    output.prices.push(item.text());
  }

  return output;
});
```

## Compile the Workflow

Add the `@browsermesh/compiler` Vite plugin to your build. At build time, the
`createWorkflow()` call is detected, evaluated, and replaced with a loader that
imports the compiled `.ir.json` sidecar.

```sh
pnpm build
```

The output module will look like:

```typescript
import __ir from './scrape.ir.json';
import { createWorkflowLoader } from '@browsermesh/sdk';
export const workflow = createWorkflowLoader(__ir);
```

## Run the Workflow

Start the runtime server:

```sh
cd apps/runtime
pnpm dev
```

Then execute the workflow:

```typescript
import { BrowserMeshClient } from '@browsermesh/sdk/node';

const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });
const result = await workflow.run({ client });
```

## Run Without Compilation

For ad-hoc execution, use the runtime loader directly:

```typescript
import { BrowserMeshClient, resolveWorkflow } from '@browsermesh/sdk/node';

const ir = await resolveWorkflow('./scrape.ir.json');
const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });

for await (const event of client.executeWorkflow({ workflow: ir })) {
  console.log(event);
}
```

## Next Steps

- Learn about [Core Concepts](/guide/core-concepts)
- Explore [Authoring Workflows](/guide/authoring-workflows)
- Read the [Architecture Overview](/architecture/overview)
