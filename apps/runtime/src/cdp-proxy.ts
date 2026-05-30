import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'node:http';
import type { Server } from 'node:http';

export type CdpUrlResolver = (taskId: string) => string | null;

export function setupCdpProxy(httpServer: Server, resolveCdpUrl: CdpUrlResolver): void {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const match = url.pathname.match(/^\/api\/debug\/([^/]+)\/(cdp|devtools\/page\/[^/]+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const taskId = match[1];
    const subPath = match[2];
    const browserCdpUrl = resolveCdpUrl(taskId);
    if (!browserCdpUrl) {
      console.error(`[cdp-proxy] Debug session not found: ${taskId}`);
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    let targetWsUrl = browserCdpUrl;
    if (subPath !== 'cdp') {
      try {
        const parsed = new URL(browserCdpUrl);
        targetWsUrl = `ws://${parsed.host}/${subPath}`;
      } catch (err) {
        console.error(`[cdp-proxy] Invalid browser CDP URL "${browserCdpUrl}":`, err);
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
        return;
      }
    }

    wss.handleUpgrade(req, socket, head, (clientWs) => {
      let browserWs: WebSocket;
      try {
        browserWs = new WebSocket(targetWsUrl);
      } catch (err) {
        console.error(`[cdp-proxy] Failed to create WebSocket to "${targetWsUrl}":`, err);
        clientWs.close();
        return;
      }

      const pendingMessages: string[] = [];
      let isBrowserWsOpen = false;

      clientWs.on('message', (data) => {
        const msg = typeof data === 'string' ? data : (data as Buffer).toString('utf-8');
        if (isBrowserWsOpen && browserWs.readyState === WebSocket.OPEN) {
          browserWs.send(msg);
        } else {
          pendingMessages.push(msg);
        }
      });

      clientWs.on('close', () => {
        browserWs.close();
      });
      clientWs.on('error', () => {
        browserWs.close();
      });

      browserWs.on('open', () => {
        console.error(`[cdp-proxy] Connected to ${targetWsUrl}`);
        isBrowserWsOpen = true;
        for (const msg of pendingMessages) {
          if (browserWs.readyState === WebSocket.OPEN) {
            browserWs.send(msg);
          }
        }
        pendingMessages.length = 0;
      });

      browserWs.on('message', (data) => {
        const msg = typeof data === 'string' ? data : (data as Buffer).toString('utf-8');
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(msg);
        }
      });

      browserWs.on('close', () => {
        clientWs.close();
      });
      browserWs.on('error', (err) => {
        console.error(`[cdp-proxy] Browser WS error for ${subPath}:`, err);
        clientWs.close();
      });
    });
  });
}
