import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';

const BASE = '/api';

export async function executeWorkflow(
  workflow: WorkflowDefinition,
  taskId?: string,
): Promise<{ taskId: string }> {
  const res = await fetch(`${BASE}/workflows/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ workflow, ...(taskId ? { taskId } : {}) }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function cancelTask(taskId: string): Promise<{ taskId: string; state: string }> {
  const res = await fetch(`${BASE}/tasks/${taskId}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function pauseTask(taskId: string): Promise<{ taskId: string; state: string }> {
  const res = await fetch(`${BASE}/tasks/${taskId}/pause`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resumeTask(taskId: string): Promise<{ taskId: string; state: string }> {
  const res = await fetch(`${BASE}/tasks/${taskId}/resume`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTaskStatus(
  taskId: string,
): Promise<{ taskId: string; state: string; message?: string }> {
  const res = await fetch(`${BASE}/tasks/${taskId}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listRunningTasks(): Promise<{
  tasks: Array<{ taskId: string; state: string; message?: string }>;
}> {
  const res = await fetch(`${BASE}/tasks`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function subscribeTaskEvents(
  taskId: string,
  onEvent: (event: WorkflowEvent) => void,
): () => void {
  const source = new EventSource(`${BASE}/tasks/${taskId}/events`);
  source.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as WorkflowEvent;
      onEvent(event);
    } catch {
      /* ignore malformed events */
    }
  };
  source.onerror = () => {
    source.close();
  };
  return () => source.close();
}
