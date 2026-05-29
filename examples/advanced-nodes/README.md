# Advanced Node Examples

These workflows demonstrate the new node types added to BrowserMesh.

## Prerequisites

Run the runtime server:

```bash
cd apps/runtime
npm run dev
```

## Importing into the Dashboard

1. Open the Dashboard at `http://localhost:5173`
2. Click **New Workflow** in the sidebar
3. Click the **Import** button (⬆) in the toolbar
4. Select one of the JSON files below

## Workflows

### `fetch-workflow.json` — API Fetch Request

Demonstrates the **Fetch Request** node. Navigates to a site, then makes a browser-context API call (preserving cookies/auth) and outputs the response status and body.

### `listen-workflow.json` — Capture API Requests

Demonstrates the **Listen Requests** node. Triggers a fetch, then uses the listen node to capture all matching requests made by the page (both fetch() and XMLHttpRequest). Filters by URL pattern `/posts/*`.

### `state-workflow.json` — Global State Counter

Demonstrates the **Global State** node. Sets a counter to an initial value, increments it twice, reads the final value, and outputs it. The state persists across workflow runs when `statePersistence` is enabled.

### `page-workflow.json` — Multi-Page Tab Management

Demonstrates the **Page/Tab** node with data-pin pageKey routing. Creates two tabs (A and B), navigates each to different URLs, fetches data from tab B while selecting/extracting from tab A, then outputs the combined result. PageKey connections are visually distinguished in the editor.

## Running via CLI

```bash
node ../web-scraper/run.mjs ./fetch-workflow.json
```
