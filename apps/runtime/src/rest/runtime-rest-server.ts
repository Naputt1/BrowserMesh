import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpRequest } from 'node:http';
import type { BrowserMeshRuntime } from '../browsermesh-runtime.js';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';
import type { AuthConfig } from '../auth-helper.js';
import { setupCdpProxy } from '../cdp-proxy.js';

export class RuntimeRestServer {
  private server: ReturnType<typeof createServer>;
  private runtime: BrowserMeshRuntime;
  private running = false;

  private taskBuffers = new Map<string, WorkflowEvent[]>();
  private taskListeners = new Map<string, Set<(event: WorkflowEvent) => void>>();

  constructor(runtime: BrowserMeshRuntime) {
    this.runtime = runtime;
    this.server = createServer((req, res) => this.handleRequest(req, res));
    setupCdpProxy(this.server, (taskId) => runtime.getDebugCdpUrl(taskId));
  }

  start(host: string, port: number): Promise<void> {
    this.running = true;
    return new Promise((resolve) => {
      this.server.listen(port, host, () => {
        console.error(`REST server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  shutdown(): Promise<void> {
    this.running = false;
    this.taskListeners.clear();
    return new Promise((resolve) => this.server.close(() => resolve()));
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const method = req.method ?? 'GET';
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const path = url.pathname;

      if (method === 'POST' && path === '/api/workflows/execute') {
        return await this.handleExecuteWorkflow(req, res);
      }

      if (method === 'POST' && path === '/api/debug/start') {
        return await this.handleStartDebug(req, res);
      }

      if (method === 'GET' && path === '/api/tasks') {
        return this.handleListTasks(res);
      }

      const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
      const eventsMatch = path.match(/^\/api\/tasks\/([^/]+)\/events$/);
      const cancelMatch = path.match(/^\/api\/tasks\/([^/]+)\/cancel$/);
      const pauseMatch = path.match(/^\/api\/tasks\/([^/]+)\/pause$/);
      const resumeMatch = path.match(/^\/api\/tasks\/([^/]+)\/resume$/);

      if (taskMatch && method === 'GET') {
        return await this.handleGetTaskStatus(taskMatch[1], res);
      }

      if (eventsMatch && method === 'GET') {
        return this.handleTaskEvents(eventsMatch[1], req, res);
      }

      if (cancelMatch && method === 'POST') {
        return await this.handleCancelTask(cancelMatch[1], res);
      }

      if (pauseMatch && method === 'POST') {
        return await this.handlePauseTask(pauseMatch[1], res);
      }

      if (resumeMatch && method === 'POST') {
        return await this.handleResumeTask(resumeMatch[1], res);
      }

      const stateMatch = path.match(/^\/api\/workflows\/([^/]+)\/state$/);
      const recoverMatch = path.match(/^\/api\/workflows\/([^/]+)\/state\/recover$/);

      if (recoverMatch && method === 'GET') {
        return await this.handleRecoverState(recoverMatch[1], res);
      }

      if (stateMatch && method === 'GET') {
        return await this.handleGetState(stateMatch[1], res);
      }

      if (stateMatch && method === 'POST') {
        return await this.handleSetState(stateMatch[1], req, res);
      }

      const debugStopMatch = path.match(/^\/api\/debug\/([^/]+)\/stop$/);
      const debugAuthMatch = path.match(/^\/api\/debug\/([^/]+)\/auth$/);
      const debugDevtoolsMatch = path.match(/^\/api\/debug\/([^/]+)\/devtools\/(.+)$/);

      if (debugStopMatch && method === 'POST') {
        return await this.handleStopDebug(debugStopMatch[1], res);
      }

      if (debugAuthMatch && method === 'POST') {
        return await this.handleDebugAuth(debugAuthMatch[1], req, res);
      }

      if (debugDevtoolsMatch && method === 'GET') {
        return await this.handleDebugDevtools(debugDevtoolsMatch[1], debugDevtoolsMatch[2], req, res);
      }

      if (method === 'GET' && path.startsWith('/json')) {
        return await this.handleJsonProxy(path, req, res);
      }

      writeJson(res, 404, { error: 'Not found' });
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  private async handleExecuteWorkflow(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = JSON.parse(await readBody(req)) as {
      workflow: WorkflowDefinition;
      taskId?: string;
    };

    const taskId = body.taskId ?? crypto.randomUUID();
    const buffer: WorkflowEvent[] = [];
    this.taskBuffers.set(taskId, buffer);
    this.taskListeners.set(taskId, new Set());

    this.runExecution(taskId, body.workflow);

    writeJson(res, 200, { taskId });
  }

  private async runExecution(taskId: string, workflow: WorkflowDefinition): Promise<void> {
    try {
      for await (const event of this.runtime.executeWorkflow({ workflow, taskId })) {
        this.bufferAndNotify(taskId, event);
      }
    } catch {
      // execution errors are yielded as events
    }
  }

  private bufferAndNotify(taskId: string, event: WorkflowEvent): void {
    const buffer = this.taskBuffers.get(taskId);
    if (buffer) buffer.push(event);

    const listeners = this.taskListeners.get(taskId);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(event);
        } catch {
          /* ignore */
        }
      }
    }
  }

  private handleListTasks(res: ServerResponse): void {
    const tasks = this.runtime.taskRegistry.listRunning().map((t) => ({
      taskId: t.taskId,
      state: t.state,
      message: t.message,
    }));
    writeJson(res, 200, { tasks });
  }

  private async handleGetTaskStatus(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.getTaskStatus(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Task not found' });
    }
  }

  private async handleCancelTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.cancelTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Task not found' });
    }
  }

  private async handlePauseTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.pauseTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Task not found' });
    }
  }

  private async handleResumeTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.resumeTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Task not found' });
    }
  }

  private async handleStartDebug(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = JSON.parse(await readBody(req)) as {
      workflow: WorkflowDefinition;
    };
    const result = await this.runtime.startDebugSession(body.workflow);
    writeJson(res, 200, {
      taskId: result.taskId,
      cdpUrl: result.cdpUrl,
      cdpPort: result.cdpPort,
    });
  }

  private async handleStopDebug(taskId: string, res: ServerResponse): Promise<void> {
    try {
      await this.runtime.stopDebugSession(taskId);
      writeJson(res, 200, { taskId, state: 'cancelled' });
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Debug session not found' });
    }
  }

  private async handleDebugAuth(taskId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = JSON.parse(await readBody(req)) as AuthConfig;
      await this.runtime.injectDebugAuth(taskId, body);
      writeJson(res, 200, { taskId, auth: true });
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : 'Failed to apply auth' });
    }
  }

  private async handleDebugDevtools(taskId: string, filePath: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const cdpPort = this.runtime.getDebugCdpPort(taskId);
    if (!cdpPort) {
      writeJson(res, 404, { error: 'Debug session not found' });
      return;
    }

    const query = (req.url ?? '').includes('?') ? (req.url ?? '').slice((req.url ?? '').indexOf('?')) : '';
    const targetUrl = `http://127.0.0.1:${cdpPort}/devtools/${filePath}${query}`;

    console.error(`[devtools-proxy] Request: ${filePath} -> ${targetUrl}`);

    return new Promise((resolve) => {
      const proxyReq = httpRequest(targetUrl, (proxyRes) => {
        console.error(`[devtools-proxy] Response for "${filePath}": status=${proxyRes.statusCode}, contentType=${proxyRes.headers['content-type']}`);

        const isHtml = (proxyRes.headers['content-type'] ?? '').includes('text/html');

        if (isHtml) {
          const headers: Record<string, string> = { 'Access-Control-Allow-Origin': '*' };
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            const lk = k.toLowerCase();
            if (lk === 'access-control-allow-origin' || lk === 'transfer-encoding' || lk === 'content-security-policy') continue;
            if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
          }

          const chunks: Buffer[] = [];
          proxyRes.on('data', (c: Buffer) => chunks.push(c));
          proxyRes.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf-8');
            const modifiedBody = body.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
            headers['content-length'] = String(Buffer.byteLength(modifiedBody, 'utf-8'));
            res.writeHead(proxyRes.statusCode ?? 200, headers);
            res.end(modifiedBody);
            resolve();
          });
        } else {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            const lk = k.toLowerCase();
            if (lk === 'content-security-policy') continue;
            if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
          }

          res.writeHead(proxyRes.statusCode ?? 200, headers);
          proxyRes.pipe(res);
          proxyRes.on('end', resolve);
        }
      });
      proxyReq.on('error', (err) => {
        console.error(`[devtools-proxy] Request to Chromium failed for "${targetUrl}":`, err);
        writeJson(res, 502, { error: 'Failed to proxy devtools request' });
        resolve();
      });
      proxyReq.end();
    });
  }

  private async handleJsonProxy(path: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    const taskIds = this.runtime.getDebugTaskIds();
    if (taskIds.length === 0) {
      writeJson(res, 404, { error: 'No active debug session' });
      return;
    }

    const taskId = taskIds[0];
    const cdpPort = this.runtime.getDebugCdpPort(taskId);
    if (!cdpPort) {
      writeJson(res, 404, { error: 'Debug session not found' });
      return;
    }

    const targetUrl = `http://127.0.0.1:${cdpPort}${path}`;

    return new Promise((resolve) => {
      const proxyReq = httpRequest(targetUrl, (proxyRes) => {
        const chunks: Buffer[] = [];
        proxyRes.on('data', (c: Buffer) => chunks.push(c));
        proxyRes.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');

          let modifiedBody = body;
          if (path === '/json/version') {
            try {
              const json = JSON.parse(body);
              json.webSocketDebuggerUrl = `ws://localhost:3000/api/debug/${taskId}/cdp`;
              modifiedBody = JSON.stringify(json);
            } catch { /* pass through unmodified */ }
          }

          const headers: Record<string, string> = { 'Access-Control-Allow-Origin': '*' };
          for (const [k, v] of Object.entries(proxyRes.headers)) {
            const lk = k.toLowerCase();
            if (lk === 'access-control-allow-origin' || lk === 'transfer-encoding' || lk === 'content-security-policy') continue;
            if (v !== undefined) headers[k] = Array.isArray(v) ? v.join(', ') : String(v);
          }
          headers['Content-Length'] = String(Buffer.byteLength(modifiedBody, 'utf-8'));

          res.writeHead(proxyRes.statusCode ?? 200, headers);
          res.end(modifiedBody);
          resolve();
        });
      });
      proxyReq.on('error', () => {
        writeJson(res, 502, { error: 'Failed to proxy json request' });
        resolve();
      });
      proxyReq.end();
    });
  }

  private async handleGetState(workflowId: string, res: ServerResponse): Promise<void> {
    try {
      const result = await this.runtime.getWorkflowState(workflowId);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  private async handleSetState(
    workflowId: string,
    req: IncomingMessage,
    res: ServerResponse,
  ): Promise<void> {
    try {
      const body = JSON.parse(await readBody(req)) as {
        state: Record<string, unknown>;
        commit?: boolean;
      };
      const result = await this.runtime.setWorkflowState(workflowId, body.state, body.commit);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  private async handleRecoverState(workflowId: string, res: ServerResponse): Promise<void> {
    try {
      const result = await this.runtime.recoverWorkflowState(workflowId);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : 'Internal error' });
    }
  }

  private handleTaskEvents(taskId: string, req: IncomingMessage, res: ServerResponse): void {
    if (!this.taskBuffers.has(taskId)) {
      writeJson(res, 404, { error: 'Task not found' });
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const buffer = this.taskBuffers.get(taskId)!;
    for (const event of buffer) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    const listener = (event: WorkflowEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const listeners = this.taskListeners.get(taskId)!;
    listeners.add(listener);

    const keepAlive = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 30000);

    req.on('close', () => {
      listeners.delete(listener);
      clearInterval(keepAlive);
    });
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function writeJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
