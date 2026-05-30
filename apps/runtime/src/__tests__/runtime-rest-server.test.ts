import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RuntimeRestServer } from '../rest/runtime-rest-server.js';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';
import * as http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

function mockRuntime() {
  let callCount = 0;
  async function* dynamicExecute(input: {
    workflow: { id: string };
    taskId?: string;
  }): AsyncGenerator<WorkflowEvent> {
    callCount++;
    const taskId = input.taskId ?? `t${callCount}`;
    yield {
      type: 'task_started',
      taskId,
      timestamp: new Date().toISOString(),
      workflowId: input.workflow.id,
    };
    yield {
      type: 'task_completed',
      taskId,
      timestamp: new Date().toISOString(),
      result: { ok: true },
    };
  }

  return {
    config: { host: '0.0.0.0', port: 0 },
    taskRegistry: {
      start: vi.fn(),
      complete: vi.fn(),
      fail: vi.fn(),
      cancel: vi.fn().mockReturnValue({ taskId: 't1', state: 'cancelled', message: 'by user' }),
      pause: vi.fn().mockReturnValue({ taskId: 't1', state: 'paused', message: 'paused' }),
      resume: vi.fn().mockReturnValue({ taskId: 't1', state: 'running' }),
      get: vi.fn().mockReturnValue({ taskId: 't1', state: 'running' }),
      listRunning: vi.fn().mockReturnValue([{ taskId: 't1', state: 'running' }]),
    },
    executeWorkflow: vi.fn().mockImplementation(dynamicExecute),
    cancelTask: vi.fn().mockResolvedValue({ taskId: 't1', state: 'cancelled', message: 'by user' }),
    pauseTask: vi.fn().mockResolvedValue({ taskId: 't1', state: 'paused', message: 'paused' }),
    resumeTask: vi.fn().mockResolvedValue({ taskId: 't1', state: 'running' }),
    getTaskStatus: vi.fn().mockResolvedValue({ taskId: 't1', state: 'running' }),
    listRunningTasks: vi.fn().mockResolvedValue([]),
  };
}

async function jsonRequest(
  port: number,
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: options?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const body =
            chunks.length > 0 ? JSON.parse(Buffer.concat(chunks).toString('utf-8')) : null;
          resolve({ status: res.statusCode ?? 500, body });
        });
      },
    );
    req.on('error', reject);
    if (options?.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function collectSse(port: number, path: string, timeoutMs = 1000): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const messages: string[] = [];
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      res.on('data', (chunk: Buffer) => {
        const lines = chunk.toString('utf-8').split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) messages.push(line.slice(6));
        }
      });
      res.on('end', () => resolve(messages));
    });
    req.on('error', reject);
    setTimeout(() => {
      req.destroy();
      resolve(messages);
    }, timeoutMs);
  });
}

async function withServer(
  fn: (port: number) => Promise<void>,
  overrides?: Record<string, unknown>,
): Promise<void> {
  const runtime = { ...mockRuntime(), ...overrides } as any;
  const server = new RuntimeRestServer(runtime);
  await server.start('127.0.0.1', 0);
  const port = (server as any).server.address().port;
  try {
    await fn(port);
  } finally {
    await server.shutdown();
  }
}

describe('RuntimeRestServer', () => {
  it('returns 404 for unknown routes', async () => {
    await withServer(async (port) => {
      const { status } = await jsonRequest(port, '/api/unknown');
      expect(status).toBe(404);
    });
  });

  it('returns 404 for unknown task routes', async () => {
    await withServer(async (port) => {
      const { status } = await jsonRequest(port, '/api/tasks/unknown/events');
      expect(status).toBe(404);
    });
  });

  it('handles CORS preflight', async () => {
    await withServer(async (port) => {
      const res = await new Promise<{ status: number; headers: http.IncomingHttpHeaders }>(
        (resolve, reject) => {
          const req = http.request(
            { hostname: '127.0.0.1', port, path: '/api/tasks', method: 'OPTIONS' },
            (res) => resolve({ status: res.statusCode ?? 500, headers: res.headers }),
          );
          req.on('error', reject);
          req.end();
        },
      );
      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe('*');
    });
  });

  it('lists running tasks', async () => {
    await withServer(async (port) => {
      const { status, body } = await jsonRequest(port, '/api/tasks');
      expect(status).toBe(200);
      expect(body).toEqual({ tasks: [{ taskId: 't1', state: 'running' }] });
    });
  });

  it('gets task status', async () => {
    await withServer(async (port) => {
      const { status, body } = await jsonRequest(port, '/api/tasks/t1');
      expect(status).toBe(200);
      expect(body).toEqual({ taskId: 't1', state: 'running' });
    });
  });

  it('returns 404 for missing task status', async () => {
    await withServer(
      async (port) => {
        const { status, body } = await jsonRequest(port, '/api/tasks/missing');
        expect(status).toBe(404);
        expect(body).toHaveProperty('error');
      },
      { getTaskStatus: vi.fn().mockRejectedValue(new Error('Task not found')) },
    );
  });

  it('cancels a task', async () => {
    await withServer(async (port) => {
      const { status, body } = await jsonRequest(port, '/api/tasks/t1/cancel', { method: 'POST' });
      expect(status).toBe(200);
      expect(body).toMatchObject({ taskId: 't1', state: 'cancelled' });
    });
  });

  it('pauses a task', async () => {
    await withServer(async (port) => {
      const { status, body } = await jsonRequest(port, '/api/tasks/t1/pause', { method: 'POST' });
      expect(status).toBe(200);
      expect(body).toMatchObject({ taskId: 't1', state: 'paused' });
    });
  });

  it('resumes a task', async () => {
    await withServer(async (port) => {
      const { status, body } = await jsonRequest(port, '/api/tasks/t1/resume', { method: 'POST' });
      expect(status).toBe(200);
      expect(body).toMatchObject({ taskId: 't1', state: 'running' });
    });
  });

  it('returns 404 for cancel on missing task', async () => {
    await withServer(
      async (port) => {
        const { status } = await jsonRequest(port, '/api/tasks/missing/cancel', { method: 'POST' });
        expect(status).toBe(404);
      },
      { cancelTask: vi.fn().mockRejectedValue(new Error('Task not found')) },
    );
  });

  it('returns 500 when taskRegistry throws', async () => {
    await withServer(
      async (port) => {
        const { status } = await jsonRequest(port, '/api/tasks');
        expect(status).toBe(500);
      },
      {
        taskRegistry: {
          start: vi.fn(),
          complete: vi.fn(),
          fail: vi.fn(),
          cancel: vi.fn(),
          pause: vi.fn(),
          resume: vi.fn(),
          get: vi.fn(),
          listRunning: vi.fn(() => {
            throw new Error('db error');
          }),
        },
      },
    );
  });

  it('executes a workflow and returns task id', async () => {
    await withServer(async (port) => {
      const workflow = { id: 'w1', nodes: [], edges: [] };
      const { status, body } = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow },
      });
      expect(status).toBe(200);
      expect(body).toHaveProperty('taskId');
      expect(typeof body.taskId).toBe('string');
    });
  });

  it('executes workflow with custom task id', async () => {
    await withServer(async (port) => {
      const workflow = { id: 'w1', nodes: [], edges: [] };
      const { status, body } = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow, taskId: 'my-custom-id' },
      });
      expect(status).toBe(200);
      expect(body).toEqual({ taskId: 'my-custom-id' });
    });
  });

  it('streams task events via SSE after workflow submission', async () => {
    await withServer(async (port) => {
      const workflow = { id: 'w1', nodes: [], edges: [] };
      const { body: submitBody } = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow },
      });
      const taskId = submitBody.taskId;

      const events = await collectSse(port, `/api/tasks/${taskId}/events`);
      expect(events.length).toBeGreaterThanOrEqual(2);

      const first = JSON.parse(events[0]);
      expect(first.type).toBe('task_started');
      expect(first.workflowId).toBe('w1');

      const last = JSON.parse(events[events.length - 1]);
      expect(last.type).toBe('task_completed');
      expect(last.result).toEqual({ ok: true });
    });
  });

  it('buffers events before SSE connection and sends them on connect', async () => {
    await withServer(async (port) => {
      const workflow = { id: 'w2', nodes: [], edges: [] };
      const { body } = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow },
      });
      const taskId = body.taskId;

      await new Promise((r) => setTimeout(r, 100));

      const events = await collectSse(port, `/api/tasks/${taskId}/events`);
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles multiple concurrent task executions', async () => {
    await withServer(async (port) => {
      const wf1 = { id: 'w1', nodes: [], edges: [] };
      const wf2 = { id: 'w2', nodes: [], edges: [] };

      const r1 = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow: wf1 },
      });
      const r2 = await jsonRequest(port, '/api/workflows/execute', {
        method: 'POST',
        body: { workflow: wf2 },
      });

      expect(r1.body.taskId).toBeTruthy();
      expect(r2.body.taskId).toBeTruthy();
      expect(r1.body.taskId).not.toBe(r2.body.taskId);

      const e1 = await collectSse(port, `/api/tasks/${r1.body.taskId}/events`);
      const e2 = await collectSse(port, `/api/tasks/${r2.body.taskId}/events`);

      expect(e1.length).toBeGreaterThanOrEqual(2);
      expect(e2.length).toBeGreaterThanOrEqual(2);
      expect(JSON.parse(e1[0]).workflowId).toBe('w1');
      expect(JSON.parse(e2[0]).workflowId).toBe('w2');
    });
  });

  it('proxies devtools request and adjusts content-length for HTML content', async () => {
    const targetServer = http.createServer((req, res) => {
      if (req.url?.includes('inspector.html')) {
        const body = '<html><head><meta http-equiv="Content-Security-Policy" content="default-src \'self\'"></head><body>hello</body></html>';
        res.writeHead(200, {
          'Content-Type': 'text/html',
          'Content-Length': String(Buffer.byteLength(body, 'utf-8')),
        });
        res.end(body);
      } else {
        const body = 'console.log()';
        res.writeHead(200, {
          'Content-Type': 'application/javascript',
          'Content-Length': String(Buffer.byteLength(body, 'utf-8')),
        });
        res.end(body);
      }
    });

    await new Promise<void>((resolve) => targetServer.listen(0, '127.0.0.1', () => resolve()));
    const targetPort = (targetServer.address() as any).port;

    try {
      await withServer(async (port) => {
        const htmlRes = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
          http.get(`http://127.0.0.1:${port}/api/debug/t1/devtools/inspector.html`, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              resolve({
                status: res.statusCode ?? 500,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf-8'),
              });
            });
          }).on('error', reject);
        });

        expect(htmlRes.status).toBe(200);
        expect(htmlRes.body).not.toContain('Content-Security-Policy');
        expect(htmlRes.headers['content-length']).toBe(String(Buffer.byteLength(htmlRes.body)));

        const jsRes = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
          http.get(`http://127.0.0.1:${port}/api/debug/t1/devtools/entrypoint.js`, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              resolve({
                status: res.statusCode ?? 500,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf-8'),
              });
            });
          }).on('error', reject);
        });

        expect(jsRes.status).toBe(200);
        expect(jsRes.body).toBe('console.log()');
        expect(jsRes.headers['content-length']).toBe('13');
      }, {
        getDebugCdpPort: vi.fn().mockReturnValue(targetPort),
      });
    } finally {
      await new Promise<void>((resolve) => targetServer.close(() => resolve()));
    }
  });

  it('proxies CDP WebSocket connection and queues initial messages', async () => {
    const backendWss = new WebSocketServer({ port: 0 });
    const backendPort = (backendWss.address() as any).port;
    const backendUrl = `ws://127.0.0.1:${backendPort}`;

    const receivedMessages: string[] = [];

    backendWss.on('connection', (ws) => {
      ws.on('message', (data) => {
        receivedMessages.push(data.toString('utf-8'));
        ws.send(`reply:${data.toString('utf-8')}`);
      });
    });

    try {
      await withServer(async (port) => {
        const clientWs = new WebSocket(`ws://127.0.0.1:${port}/api/debug/t1/cdp`);
        
        const clientReceived: string[] = [];
        clientWs.on('message', (data) => {
          clientReceived.push(data.toString('utf-8'));
        });

        clientWs.on('open', () => {
          clientWs.send('msg1');
          clientWs.send('msg2');
        });

        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (clientReceived.length >= 2) {
              clearInterval(check);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(check);
            resolve();
          }, 3000);
        });

        expect(receivedMessages).toEqual(['msg1', 'msg2']);
        expect(clientReceived).toEqual(['reply:msg1', 'reply:msg2']);

        clientWs.close();
      }, {
        getDebugCdpUrl: vi.fn().mockReturnValue(backendUrl),
      });
    } finally {
      await new Promise<void>((resolve) => backendWss.close(() => resolve()));
    }
  });

  it('proxies page-specific CDP WebSocket connection', async () => {
    const backendWss = new WebSocketServer({ port: 0 });
    const backendPort = (backendWss.address() as any).port;
    const backendUrl = `ws://127.0.0.1:${backendPort}/devtools/browser/xyz`;

    const receivedPaths: string[] = [];

    backendWss.on('connection', (ws, req) => {
      receivedPaths.push(req.url ?? '');
      ws.on('message', (data) => {
        ws.send(`reply:${data.toString('utf-8')}`);
      });
    });

    try {
      await withServer(async (port) => {
        const clientWs = new WebSocket(`ws://127.0.0.1:${port}/api/debug/t1/devtools/page/p123`);
        
        const clientReceived: string[] = [];
        clientWs.on('message', (data) => {
          clientReceived.push(data.toString('utf-8'));
        });

        clientWs.on('open', () => {
          clientWs.send('hello');
        });

        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (clientReceived.length >= 1) {
              clearInterval(check);
              resolve();
            }
          }, 50);
          setTimeout(() => {
            clearInterval(check);
            resolve();
          }, 3000);
        });

        expect(receivedPaths).toEqual(['/devtools/page/p123']);
        expect(clientReceived).toEqual(['reply:hello']);

        clientWs.close();
      }, {
        getDebugCdpUrl: vi.fn().mockReturnValue(backendUrl),
      });
    } finally {
      await new Promise<void>((resolve) => backendWss.close(() => resolve()));
    }
  });
});
