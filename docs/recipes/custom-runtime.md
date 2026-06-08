# Custom Runtime

Embed the BrowserMesh runtime programmatically in your own application instead of running it as a standalone server.

## Basic Setup

```typescript
import { BrowserMeshRuntime } from '@browsermesh/runtime';

const runtime = new BrowserMeshRuntime({
  maxBrowsers: 4,
  headless: true,
  browserDataDir: './state/browsers',
  stateDir: './state',
});

await runtime.start();
```

## Execute a Workflow

```typescript
import { resolveWorkflow } from '@browsermesh/sdk/node';

const ir = await resolveWorkflow('./workflow.ir.json');

const task = await runtime.executeWorkflow({
  workflow: ir,
  onEvent: (event) => {
    switch (event.type) {
      case 'step_started':
        console.log(`Step: ${event.stepType}`);
        break;
      case 'screenshot':
        fs.writeFileSync(`screenshot-${event.label}.png`, event.data);
        break;
      case 'task_completed':
        console.log('Done:', event.result);
        break;
    }
  },
});

console.log(`Task ID: ${task.taskId}`);
```

## Register Custom Handlers

Add application-specific node handlers:

```typescript
const runtime = new BrowserMeshRuntime({
  customHandlers: {
    sendEmail: async (context, config) => {
      // config.subject, config.body, config.to
      await emailService.send(config);
      return { sent: true };
    },

    queryDatabase: async (context, config) => {
      const results = await db.query(config.query);
      return { rows: results };
    },
  },
});
```

Then use them in your workflow via the `custom` node type.

## Task Lifecycle

```typescript
// Pause
await runtime.pauseTask(taskId);

// Resume
await runtime.resumeTask(taskId);

// Cancel
await runtime.cancelTask(taskId, 'User requested cancellation');

// Get status
const status = await runtime.getTaskStatus(taskId);
console.log(status.state);
```

## State Persistence

```typescript
// Save state
await runtime.setWorkflowState('my-workflow', { page: 5, done: false });

// Load state
const state = await runtime.getWorkflowState('my-workflow');

// Recover after restart
await runtime.recoverWorkflowState('my-workflow');
```

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await runtime.stop();
  process.exit(0);
});
```
