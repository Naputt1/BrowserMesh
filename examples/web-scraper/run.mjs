#!/usr/bin/env node
/**
 * BrowserMesh Web Scraper Demo Runner
 *
 * Submits a workflow to a running BrowserMesh runtime via the REST API
 * and prints events as they stream in.
 *
 * Usage:
 *   node run.mjs
 *   node run.mjs --workflow workflow-loop.json
 *   HOST=localhost REST_PORT=50052 node run.mjs
 */

const BASE = `http://${process.env.HOST ?? "localhost"}:${process.env.REST_PORT ?? "50052"}`;
const WORKFLOW_FILE = process.argv[2] ?? new URL("./workflow-basic.json", import.meta.url).pathname;

async function main() {
  // 1. Load the workflow definition
  const fs = await import("node:fs");
  const workflow = JSON.parse(fs.readFileSync(WORKFLOW_FILE, "utf-8"));
  console.log(`Running workflow: ${workflow.name ?? workflow.id}`);
  console.log(`Nodes: ${workflow.nodes.map((n) => n.type).join(" → ")}`);
  console.log("");

  // 2. Submit the workflow
  const submitRes = await fetch(`${BASE}/api/workflows/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workflow }),
  });

  if (!submitRes.ok) {
    console.error("Failed to submit workflow:", await submitRes.text());
    process.exit(1);
  }

  const { taskId } = await submitRes.json();
  console.log(`Task ID: ${taskId}`);
  console.log("");

  // 3. Connect to SSE event stream
  const events = new EventSource(`${BASE}/api/tasks/${taskId}/events`);

  events.onmessage = (msg) => {
    const event = JSON.parse(msg.data);
    const time = new Date(event.timestamp).toLocaleTimeString();

    switch (event.type) {
      case "task_started":
        console.log(`[${time}] 🚀 Task started (workflow: ${event.workflowId})`);
        break;
      case "step_started":
        console.log(`[${time}]   ▶ ${event.stepType}: ${event.stepId}`);
        break;
      case "step_completed":
        console.log(`[${time}]   ✓ ${event.stepId}`);
        break;
      case "partial_data":
        console.log(`[${time}]   📊 ${event.path} =`, JSON.stringify(event.value));
        break;
      case "log":
        console.log(`[${time}]   [${event.level}] ${event.message}`);
        break;
      case "progress":
        console.log(`[${time}]   ⌛ ${event.message ?? `${event.completedSteps}/${event.totalSteps}`}`);
        break;
      case "task_completed":
        console.log(`[${time}] ✅ Task completed`);
        if (event.result) console.log("Result:", JSON.stringify(event.result, null, 2));
        events.close();
        break;
      case "task_failed":
        console.log(`[${time}] ❌ Task failed: ${event.message}`);
        events.close();
        process.exitCode = 1;
        break;
    }
  };

  events.onerror = () => {
    console.error("Connection lost");
    events.close();
    process.exitCode = 1;
  };
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
