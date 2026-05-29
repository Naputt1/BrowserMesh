# Web Scraper Demo

This example demonstrates BrowserMesh's web scraping capabilities using the runtime's REST API.

## Prerequisites

- A running BrowserMesh runtime (see root README or run `pnpm start` in `apps/runtime`)
- Node.js 22+

## Workflows

### Basic Workflow (`workflow-basic.json`)

Navigates to Wikipedia's "Web scraping" article and extracts:

- The page title
- The first paragraph

Nodes: `navigate → extract → extract → wait`

### Loop Workflow (`workflow-loop.json`)

Navigates to Books to Scrape and loops through all books on the page:

- Iterates over each `article.product_pod` element
- Extracts the book title and price for each

Nodes: `navigate → loop(extract, extract)`

## Running

```bash
# Ensure the runtime is running on localhost:50052
cd ../../
pnpm --filter @browsermesh/runtime start

# In another terminal, run the basic scraper
node run.mjs

# Run the loop-based scraper
node run.mjs workflow-loop.json

# Custom host/port
HOST=0.0.0.0 REST_PORT=50052 node run.mjs
```

The runner will:

1. Submit the workflow to the runtime
2. Connect to the SSE event stream
3. Print each event with emoji indicators

## Importing into the Dashboard

Both workflow JSON files can be imported into the BrowserMesh Dashboard:

1. Start the runtime: `pnpm --filter @browsermesh/runtime start`
2. Start the dashboard: `pnpm --filter @browsermesh/dashboard dev`
3. Open http://localhost:3000
4. Click "New Workflow"
5. Click the import button (⬆) and select the workflow JSON file
6. Click "Run Workflow"
