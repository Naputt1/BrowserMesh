import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { workflowRoutes } from './routes/workflows.js';

const app = new Hono();

app.use('*', cors());

app.route('/api/workflows', workflowRoutes);

app.get('/api/health', (c) => c.json({ status: 'ok' }));

app.route('/dashboard-api', workflowRoutes);

app.get('/dashboard-api/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT ?? 50055);
const host = process.env.HOST ?? '0.0.0.0';

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

console.error(`Dashboard server listening on ${host}:${port}`);
