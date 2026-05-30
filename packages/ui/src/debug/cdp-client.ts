type PendingRequest = {
  resolve: (result: unknown) => void;
  reject: (err: Error) => void;
};

type EventHandler = (params: unknown, sessionId?: string) => void;

export class CDPClient {
  private ws: WebSocket;
  private msgId = 0;
  private pending = new Map<number, PendingRequest>();
  private eventHandlers = new Map<string, Set<EventHandler>>();
  private sessionEventHandlers = new Map<string, Map<string, Set<(params: unknown) => void>>>();
  private _connected = false;
  private _closed = false;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event: MessageEvent) => this.handleMessage(event.data as string);
    this.ws.onclose = () => { this._closed = true; };
    this.ws.onerror = () => { this._closed = true; };
  }

  get connected(): boolean {
    return this._connected;
  }

  get closed(): boolean {
    return this._closed;
  }

  waitForOpen(): Promise<void> {
    if (this._connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.onopen = () => {
        this._connected = true;
        resolve();
      };
      this.ws.onerror = () => {
        this._closed = true;
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  async send<T = unknown>(method: string, params?: object, sessionId?: string): Promise<T> {
    const id = ++this.msgId;
    const msg: Record<string, unknown> = { id, method };
    if (params) msg.params = params;
    if (sessionId) msg.sessionId = sessionId;

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
      });
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (err) {
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  on(method: string, handler: EventHandler): void {
    let handlers = this.eventHandlers.get(method);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(method, handlers);
    }
    handlers.add(handler);
  }

  off(method: string, handler: EventHandler): void {
    this.eventHandlers.get(method)?.delete(handler);
  }

  onSession(sessionId: string, method: string, handler: (params: unknown) => void): void {
    let sessions = this.sessionEventHandlers.get(sessionId);
    if (!sessions) {
      sessions = new Map();
      this.sessionEventHandlers.set(sessionId, sessions);
    }
    let handlers = sessions.get(method);
    if (!handlers) {
      handlers = new Set();
      sessions.set(method, handlers);
    }
    handlers.add(handler);
  }

  async enableDomain(domain: string, sessionId?: string): Promise<void> {
    await this.send(`${domain}.enable`, undefined, sessionId);
  }

  async createPage(url = 'about:blank'): Promise<{ targetId: string; sessionId: string }> {
    const { targetId } = await this.send<{ targetId: string }>('Target.createTarget', { url });
    const { sessionId } = await this.send<{ sessionId: string }>('Target.attachToTarget', {
      targetId,
      flatten: true,
    });
    return { targetId, sessionId };
  }

  async closePage(targetId: string): Promise<void> {
    await this.send('Target.closeTarget', { targetId });
  }

  async getPageScreenshot(sessionId?: string): Promise<string> {
    const { data } = await this.send<{ data: string }>(
      'Page.captureScreenshot',
      { format: 'png', fromSurface: true },
      sessionId,
    );
    return data;
  }

  async evaluate(expression: string, sessionId?: string): Promise<unknown> {
    const { result } = await this.send<{ result: { value?: unknown; type: string } }>(
      'Runtime.evaluate',
      { expression, returnByValue: true, awaitPromise: true },
      sessionId,
    );
    return result.value;
  }

  async getURL(sessionId?: string): Promise<string> {
    const value = await this.evaluate('window.location.href', sessionId);
    return String(value ?? '');
  }

  async navigate(url: string, sessionId?: string): Promise<void> {
    await this.send('Page.navigate', { url }, sessionId);
  }

  close(): void {
    this._closed = true;
    this.ws.close();
    for (const { reject } of this.pending.values()) {
      reject(new Error('CDP connection closed'));
    }
    this.pending.clear();
  }

  private handleMessage(data: string): void {
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }

    const id = msg.id as number | undefined;
    if (id != null) {
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        if (msg.error) {
          pending.reject(new Error((msg.error as { message: string }).message));
        } else {
          pending.resolve(msg.result);
        }
      }
      return;
    }

    if (msg.method) {
      const method = msg.method as string;
      const params = msg.params;
      const sessionId = msg.sessionId as string | undefined;

      const handlers = this.eventHandlers.get(method);
      if (handlers) {
        for (const handler of handlers) {
          try { handler(params, sessionId); } catch { /* ignore */ }
        }
      }

      if (sessionId) {
        const sessionHandlers = this.sessionEventHandlers.get(sessionId)?.get(method);
        if (sessionHandlers) {
          for (const handler of sessionHandlers) {
            try { handler(params); } catch { /* ignore */ }
          }
        }
      }
    }
  }
}
