# Examples

The `examples/` directory contains ready-to-run workflows demonstrating different features.

## Web Scraper

Directory: `examples/web-scraper/`

Demonstrates basic browser automation with two compiled JSON workflows:

- `workflow-basic.json` — navigate to a page and extract content
- `workflow-loop.json` — scrape multiple items using a loop

Run with:

```sh
node examples/web-scraper/run.mjs
```

The runner script loads the IR files and executes them against a running runtime server.

## Logic Nodes

Directory: `examples/logic-nodes/`

Demonstrates conditional logic: `if`/`else` branches, `switch` cases, and boolean combinators (`and`, `or`, `not`, `compare`).

Shows how to:
- Branch execution based on page content
- Combine multiple conditions
- Compare extracted values

## Advanced Nodes

Directory: `examples/advanced-nodes/`

Demonstrates advanced node types:

- **Fetch** — make HTTP requests within a workflow
- **Listen** — capture network requests made by the page
- **State** — read and write global state across workflow steps
- **Page/Tab** — manage multiple browser pages or tabs

## Compiler Example

Directory: `examples/compiler/`

Shows how to use the `@browsermesh/compiler` outside of Vite:

- `workflow.ts` — a TypeScript workflow definition
- `compile.mjs` — a Node.js script that compiles the workflow using `compileFile()`

```sh
node examples/compiler/compile.mjs
```

This produces a `.ir.json` sidecar that can be executed with the runtime.

## Running Examples

1. Start the runtime server:

```sh
cd apps/runtime
pnpm dev
```

2. In another terminal, run an example:

```sh
node examples/web-scraper/run.mjs
```
