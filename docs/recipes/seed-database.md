# Seed a Database

Use BrowserMesh to scrape data and insert it into a database in a single workflow.

## Approach

The preferred approach is to use the **custom handler** extensibility point. Register a database handler on the runtime that receives scraped data and persists it.

## 1. Register a Custom Handler

```typescript
import { BrowserMeshRuntime } from '@browsermesh/runtime';
import { db } from './your-database-client';

const runtime = new BrowserMeshRuntime({
  customHandlers: {
    insertProducts: async (context, config) => {
      const { products } = config;
      await db.product.createMany({ data: products });
      return { inserted: products.length };
    },
  },
});
```

## 2. Define the Workflow

```typescript
import { createWorkflow } from '@browsermesh/sdk';

interface Product {
  name: string;
  price: string;
}

const workflow = createWorkflow<{ count: number }>((wf) => {
  const page = wf.createPage().navigate({ url: 'https://books.toscrape.com' });

  const items = page.select({ selector: '.product_pod' }).selectAll();
  const products: Product[] = [];

  for (const item of items) {
    const name = item.select({ selector: 'h3 a' }).text('name');
    const price = item.select({ selector: '.price_color' }).text('price');
    products.push({ name, price });
  }

  // Custom handler call — compiles to a 'custom' node
  const result = wf.custom('insertProducts', { products });

  return { count: products.length };
});
```

## 3. Compile and Run

Compile the workflow with the Vite plugin, then execute against a runtime with the `insertProducts` handler registered.

## Alternative: Use the SDK

For simpler cases, run the workflow and insert results in application code:

```typescript
import { BrowserMeshClient, resolveWorkflow } from '@browsermesh/sdk/node';
import { db } from './your-database-client';

const workflow = await resolveWorkflow('./scrape.ir.json');
const client = new BrowserMeshClient({ endpoint: 'localhost:50051' });

for await (const event of client.executeWorkflow({ workflow })) {
  if (event.type === 'task_completed') {
    await db.product.createMany({ data: event.result.products });
  }
}
```
