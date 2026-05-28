import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { BrowserMeshRuntime } from "../browsermesh-runtime.js";
import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";

export class RuntimeRestServer {
  private server: ReturnType<typeof createServer>;
  private runtime: BrowserMeshRuntime;
  private running = false;

  private taskBuffers = new Map<string, WorkflowEvent[]>();
  private taskListeners = new Map<string, Set<(event: WorkflowEvent) => void>>();

  constructor(runtime: BrowserMeshRuntime) {
    this.runtime = runtime;
    this.server = createServer((req, res) => this.handleRequest(req, res));
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
      const method = req.method ?? "GET";
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      const path = url.pathname;

      if (method === "POST" && path === "/api/workflows/execute") {
        return await this.handleExecuteWorkflow(req, res);
      }

      if (method === "GET" && path === "/api/tasks") {
        return this.handleListTasks(res);
      }

      const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
      const eventsMatch = path.match(/^\/api\/tasks\/([^/]+)\/events$/);
      const cancelMatch = path.match(/^\/api\/tasks\/([^/]+)\/cancel$/);
      const pauseMatch = path.match(/^\/api\/tasks\/([^/]+)\/pause$/);
      const resumeMatch = path.match(/^\/api\/tasks\/([^/]+)\/resume$/);

      if (taskMatch && method === "GET") {
        return await this.handleGetTaskStatus(taskMatch[1], res);
      }

      if (eventsMatch && method === "GET") {
        return this.handleTaskEvents(eventsMatch[1], req, res);
      }

      if (cancelMatch && method === "POST") {
        return await this.handleCancelTask(cancelMatch[1], res);
      }

      if (pauseMatch && method === "POST") {
        return await this.handlePauseTask(pauseMatch[1], res);
      }

      if (resumeMatch && method === "POST") {
        return await this.handleResumeTask(resumeMatch[1], res);
      }

      const stateMatch = path.match(/^\/api\/workflows\/([^/]+)\/state$/);
      const recoverMatch = path.match(/^\/api\/workflows\/([^/]+)\/state\/recover$/);

      if (recoverMatch && method === "GET") {
        return await this.handleRecoverState(recoverMatch[1], res);
      }

      if (stateMatch && method === "GET") {
        return await this.handleGetState(stateMatch[1], res);
      }

      if (stateMatch && method === "POST") {
        return await this.handleSetState(stateMatch[1], req, res);
      }

      writeJson(res, 404, { error: "Not found" });
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  private async handleExecuteWorkflow(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = JSON.parse(await readBody(req)) as { workflow: WorkflowDefinition; taskId?: string };

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
        try { cb(event); } catch { /* ignore */ }
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
      writeJson(res, 404, { error: err instanceof Error ? err.message : "Task not found" });
    }
  }

  private async handleCancelTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.cancelTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : "Task not found" });
    }
  }

  private async handlePauseTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.pauseTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : "Task not found" });
    }
  }

  private async handleResumeTask(taskId: string, res: ServerResponse): Promise<void> {
    try {
      const status = await this.runtime.resumeTask(taskId);
      writeJson(res, 200, status);
    } catch (err) {
      writeJson(res, 404, { error: err instanceof Error ? err.message : "Task not found" });
    }
  }

  private async handleGetState(workflowId: string, res: ServerResponse): Promise<void> {
    try {
      const result = await this.runtime.getWorkflowState(workflowId);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  private async handleSetState(workflowId: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      const body = JSON.parse(await readBody(req)) as { state: Record<string, unknown>; commit?: boolean };
      const result = await this.runtime.setWorkflowState(workflowId, body.state, body.commit);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  private async handleRecoverState(workflowId: string, res: ServerResponse): Promise<void> {
    try {
      const result = await this.runtime.recoverWorkflowState(workflowId);
      writeJson(res, 200, result);
    } catch (err) {
      writeJson(res, 500, { error: err instanceof Error ? err.message : "Internal error" });
    }
  }

  private handleTaskEvents(taskId: string, req: IncomingMessage, res: ServerResponse): void {
    if (!this.taskBuffers.has(taskId)) {
      writeJson(res, 404, { error: "Task not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
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
      res.write(": keepalive\n\n");
    }, 30000);

    req.on("close", () => {
      listeners.delete(listener);
      clearInterval(keepAlive);
    });
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

function writeJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}
