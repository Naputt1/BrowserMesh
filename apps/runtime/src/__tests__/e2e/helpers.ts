import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';

const RUNTIME_SCRIPT = resolve(import.meta.dirname ?? __dirname, '../../../dist/cli.js');

export type RuntimeProcess = {
  process: ChildProcess;
  grpcPort: number;
  restPort: number;
  stop: () => void;
};

function randomPort(): number {
  return Math.floor(Math.random() * 20000) + 40000;
}

export async function startRuntime(timeoutMs = 30000): Promise<RuntimeProcess> {
  const grpcPort = randomPort();
  const restPort = randomPort();

  const proc = spawn(
    'node',
    [RUNTIME_SCRIPT, '--grpc-port', String(grpcPort), '--rest-port', String(restPort)],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  proc.stderr?.on('data', () => {});
  proc.stdout?.on('data', () => {});

  const stop = () => {
    if (!proc.killed) proc.kill('SIGTERM');
  };

  await waitForRuntime(restPort, timeoutMs);

  return { process: proc, grpcPort, restPort, stop };
}

async function waitForRuntime(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  const url = `http://127.0.0.1:${port}/api/tasks`;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* server not ready yet */
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  throw new Error(`Runtime did not become ready within ${timeoutMs}ms`);
}

export async function executeWorkflow(
  restPort: number,
  workflow: WorkflowDefinition,
): Promise<string> {
  const res = await fetch(`http://127.0.0.1:${restPort}/api/workflows/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to execute workflow: ${res.status} ${text}`);
  }

  const body = (await res.json()) as { taskId: string };
  return body.taskId;
}

const TERMINAL_EVENTS = new Set(['task_completed', 'task_failed']);

export async function collectEvents(
  restPort: number,
  taskId: string,
  timeoutMs = 30000,
): Promise<WorkflowEvent[]> {
  const res = await fetch(`http://127.0.0.1:${restPort}/api/tasks/${taskId}/events`);

  if (!res.ok) {
    throw new Error(`Failed to get events: ${res.status}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const events: WorkflowEvent[] = [];
  let buffer = '';
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const parsed = JSON.parse(line.slice(6)) as WorkflowEvent;
          events.push(parsed);
          if (TERMINAL_EVENTS.has(parsed.type)) {
            reader.cancel();
            return events;
          }
        } catch {
          /* skip malformed lines */
        }
      }
    }
  }

  return events;
}
