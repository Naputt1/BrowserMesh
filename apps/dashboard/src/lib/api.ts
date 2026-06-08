import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/sdk';

const BASE = '/api';
const DASHBOARD_BASE = '/dashboard-api';

export type WorkflowRecord = {
  id: string;
  name: string;
  type: 'visual' | 'compiled';
  workflow: WorkflowDefinition;
  source?: string;
  createdAt: string;
  updatedAt: string;
};

export async function listWorkflows(): Promise<WorkflowRecord[]> {
  const res = await fetch(`${DASHBOARD_BASE}/workflows`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getWorkflow(id: string): Promise<WorkflowRecord> {
  const res = await fetch(`${DASHBOARD_BASE}/workflows/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveWorkflow(record: {
  id?: string;
  name?: string;
  workflow: WorkflowDefinition;
  type?: 'visual' | 'compiled';
  source?: string;
}): Promise<WorkflowRecord> {
  const res = await fetch(`${DASHBOARD_BASE}/workflows`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(record),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteWorkflow(id: string): Promise<void> {
  const res = await fetch(`${DASHBOARD_BASE}/workflows/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}

export async function compileWorkflow(source: string, name?: string): Promise<WorkflowRecord> {
  const res = await fetch(`${DASHBOARD_BASE}/workflows/compile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, name }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

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
