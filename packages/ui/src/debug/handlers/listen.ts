import type { DebugNodeHandler } from '../types';

const INTERCEPT_SCRIPT = `
window.__browsermesh_requests = window.__browsermesh_requests || [];

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
    window.__browsermesh_requests.push({ url, method, requestBody: typeof reqBody === 'string' ? reqBody : null, status: clone.status, statusText: clone.statusText, responseHeaders, responseBody, timestamp });
    return response;
  } catch (e) {
    window.__browsermesh_requests.push({ url, method, requestBody: typeof reqBody === 'string' ? reqBody : null, status: 0, statusText: e.message, error: true, timestamp });
    throw e;
  }
};
`;

function globMatch(pattern: string, url: string): boolean {
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  try {
    return new RegExp(`^${regexStr}$`).test(url);
  } catch {
    return false;
  }
}

function matchesAnyPattern(patterns: string[], url: string): boolean {
  return patterns.some((p) => globMatch(p, url));
}

export const listenHandler: DebugNodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const sessionId = context.getSession();
  const urlPatterns = (config.urlPatterns as string[]) ?? [];
  const captureResponse = config.captureResponse !== false;
  const injectOnNavigate = config.injectOnNavigate !== false;

  const hasInterceptor = await context.cdp.evaluate(
    `typeof window.__browsermesh_requests !== 'undefined'`,
    sessionId,
  );

  const escapedScript = JSON.stringify(INTERCEPT_SCRIPT);

  if (!hasInterceptor) {
    if (injectOnNavigate) {
      await context.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: INTERCEPT_SCRIPT,
      }, sessionId);
    }
    await context.cdp.evaluate(
      `window.__browsermesh_requests = []; (${INTERCEPT_SCRIPT})()`,
      sessionId,
    );
  }

  const pauseMs = (config.waitMs as number) ?? 500;
  if (pauseMs > 0) {
    await new Promise((r) => setTimeout(r, pauseMs));
  }

  const allRequests = await context.cdp.evaluate(
    `JSON.stringify(window.__browsermesh_requests)`,
    sessionId,
  ) as string;

  const parsed = JSON.parse(allRequests ?? '[]') as Array<Record<string, unknown>>;
  const matched = urlPatterns.length > 0
    ? parsed.filter((r) => matchesAnyPattern(urlPatterns, String(r.url ?? '')))
    : parsed;

  if (!captureResponse) {
    for (const r of matched) {
      delete r.responseBody;
    }
  }

  context.setOutput('requests', matched);
};
