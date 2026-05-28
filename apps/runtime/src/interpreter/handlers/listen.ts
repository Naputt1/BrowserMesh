import type { NodeHandler } from "../types.js";

const INTERCEPT_SCRIPT = `
window.__browsermesh_requests = [];

const origFetch = window.fetch.bind(window);
window.fetch = async function(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init && init.method) || (typeof input !== 'string' && input.method) || 'GET';
  const reqBody = (init && init.body) || null;
  const timestamp = Date.now();

  try {
    const response = await origFetch(input, init);
    const clone = response.clone();
    const responseHeaders = {};
    clone.headers.forEach((v, k) => { responseHeaders[k] = v; });
    const responseBody = await clone.text();

    window.__browsermesh_requests.push({
      url,
      method,
      requestBody: typeof reqBody === 'string' ? reqBody : null,
      status: clone.status,
      statusText: clone.statusText,
      responseHeaders,
      responseBody,
      timestamp
    });

    return response;
  } catch (e) {
    window.__browsermesh_requests.push({
      url,
      method,
      requestBody: typeof reqBody === 'string' ? reqBody : null,
      status: 0,
      statusText: e.message,
      error: true,
      timestamp
    });
    throw e;
  }
};

const origOpen = XMLHttpRequest.prototype.open;
const origSend = XMLHttpRequest.prototype.send;
const xhrData = new WeakMap();

XMLHttpRequest.prototype.open = function(method, url) {
  xhrData.set(this, { method: String(method), url: String(url), startTime: Date.now() });
  return origOpen.apply(this, arguments);
};

XMLHttpRequest.prototype.send = function(body) {
  const data = xhrData.get(this);
  if (data) {
    data.requestBody = body ? String(body) : null;
  }
  this.addEventListener('load', function() {
    const d = xhrData.get(this);
    if (d) {
      const headers = {};
      try {
        this.getAllResponseHeaders().split('\\r\\n').filter(Boolean).forEach(line => {
          const idx = line.indexOf(':');
          if (idx > 0) {
            headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
          }
        });
      } catch(e) {}
      window.__browsermesh_requests.push({
        url: d.url,
        method: d.method,
        requestBody: d.requestBody,
        status: this.status,
        statusText: this.statusText,
        responseHeaders: headers,
        responseBody: this.responseText || null,
        timestamp: d.startTime
      });
    }
  });
  this.addEventListener('error', function() {
    const d = xhrData.get(this);
    if (d) {
      window.__browsermesh_requests.push({
        url: d.url,
        method: d.method,
        requestBody: d.requestBody,
        status: 0,
        statusText: 'Network error',
        error: true,
        timestamp: d.startTime
      });
    }
  });
  return origSend.apply(this, arguments);
};
`;

function globMatch(pattern: string, url: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  try {
    return new RegExp(`^${regexStr}$`).test(url);
  } catch {
    return false;
  }
}

function matchesAnyPattern(patterns: string[], url: string): boolean {
  return patterns.some((p) => globMatch(p, url));
}

export const listenHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const urlPatterns = (config.urlPatterns as string[]) ?? [];
  const captureResponse = config.captureResponse !== false;
  const injectOnNavigate = config.injectOnNavigate !== false;

  const checkScript = `typeof window.__browsermesh_requests !== 'undefined'`;
  const hasInterceptor = await context.page.evaluate(checkScript);

  if (!hasInterceptor) {
    await context.page.addInitScript(INTERCEPT_SCRIPT);
    await context.page.evaluate(`window.__browsermesh_requests = []`);
  }

  const pauseMs = (config.waitMs as number) ?? 500;
  if (pauseMs > 0) {
    await new Promise((r) => setTimeout(r, pauseMs));
  }

  const raw = await context.page.evaluate(`JSON.stringify(window.__browsermesh_requests)`);
  const allRequests = JSON.parse(raw as string) as Array<Record<string, unknown>>;

  const matched = urlPatterns.length > 0
    ? allRequests.filter((r) => matchesAnyPattern(urlPatterns, String(r.url ?? "")))
    : allRequests;

  if (!captureResponse) {
    for (const r of matched) {
      delete r.responseBody;
    }
  }

  context.setOutput("requests", matched);
};
