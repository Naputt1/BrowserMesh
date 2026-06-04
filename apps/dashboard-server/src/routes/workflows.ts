import { Hono } from 'hono';
import type { WorkflowIR } from '@browsermesh/workflow';
import type { WorkflowRecord } from '../types.js';
import { listWorkflows, getWorkflow, saveWorkflow, deleteWorkflow } from '../storage.js';
import { listCompiledWorkflows } from '../compiled.js';

const app = new Hono();

app.get('/', (c) => {
  const visual = listWorkflows();
  const compiled = listCompiledWorkflows().map((ir) => {
    const record: WorkflowRecord = {
      id: ir.id ?? `compiled-${ir.name ?? 'unknown'}`,
      name: ir.name ?? 'Compiled Workflow',
      type: 'compiled',
      workflow: ir,
      createdAt: '',
      updatedAt: '',
    };
    return record;
  });

  const merged = [...compiled, ...visual];
  merged.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return c.json(merged);
});

app.get('/:id', (c) => {
  const workflow = getWorkflow(c.req.param('id'));
  if (!workflow) return c.json({ error: 'Workflow not found' }, 404);
  return c.json(workflow);
});

app.post('/', async (c) => {
  const body = await c.req.json<{
    id?: string;
    name?: string;
    workflow: WorkflowIR;
    type?: 'visual' | 'compiled';
    source?: string;
  }>();

  if (!body.workflow) {
    return c.json({ error: 'workflow field is required' }, 400);
  }

  const now = new Date().toISOString();
  const existing = body.id ? getWorkflow(body.id) : null;

  const record: WorkflowRecord = {
    id: body.id ?? body.workflow.id ?? crypto.randomUUID(),
    name: body.name ?? body.workflow.name ?? `Workflow ${now.slice(0, 10)}`,
    type: body.type ?? 'visual',
    workflow: body.workflow,
    ...(body.source ? { source: body.source } : {}),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  saveWorkflow(record);
  return c.json(record, 201);
});

app.delete('/:id', (c) => {
  const deleted = deleteWorkflow(c.req.param('id'));
  if (!deleted) return c.json({ error: 'Workflow not found' }, 404);
  return c.json({ deleted: true });
});

app.post('/compile', async (c) => {
  const body = await c.req.json<{
    source: string;
    name?: string;
  }>();

  if (!body.source) {
    return c.json({ error: 'source field is required' }, 400);
  }

  try {
    const { compileSource } = await import('@browsermesh/compiler');
    const compiled = await compileSource(body.source, 'workflow.ts');

    if (!compiled) {
      return c.json({ error: 'No createWorkflow call found in source' }, 400);
    }

    const now = new Date().toISOString();
    const record: WorkflowRecord = {
      id: crypto.randomUUID(),
      name: body.name ?? compiled.exportName ?? 'Compiled Workflow',
      type: 'compiled',
      workflow: compiled.ir,
      source: body.source,
      createdAt: now,
      updatedAt: now,
    };

    saveWorkflow(record);

    return c.json(record, 201);
  } catch (err) {
    return c.json(
      {
        error: `Compilation failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      400,
    );
  }
});

export { app as workflowRoutes };
