import type { DebugNodeHandler } from '../types';

function resolveVars(template: string, variables: Record<string, string>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, name) => variables[name] ?? `\${${name}}`);
}

export const fetchHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const method = (config.method as string) ?? 'GET';
  let url = (inputs.url as string) ?? (config.url as string);
  if (!url) throw new Error('fetch node requires a url in config or connected to URL input');

  const rawHeaders = (config.headers as Array<{ key: string; value: string }>) ?? [];
  const rawQueryParams = (config.queryParams as Array<{ key: string; value: string }>) ?? [];
  let body = config.body as string | undefined;

  const variables: Record<string, string> = {};
  const varNames = (config.variables as string[]) ?? [];
  for (const v of varNames) {
    const val = inputs[v] as string | undefined;
    if (val != null) variables[v] = val;
  }

  url = resolveVars(url, variables);

  const queryString = rawQueryParams
    .filter((p) => p.key)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(resolveVars(p.value, variables))}`)
    .join('&');
  if (queryString) url += (url.includes('?') ? '&' : '?') + queryString;

  const headers: Record<string, string> = {};
  for (const h of rawHeaders) {
    if (h.key) headers[h.key] = resolveVars(h.value, variables);
  }

  if (body) body = resolveVars(body, variables);

  const fetchOpts: Record<string, unknown> = { method, headers };
  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOpts.body = body;
  }

  const script = `(() => { return fetch(${JSON.stringify(url)}, ${JSON.stringify(fetchOpts)}).then(async res => { const responseHeaders = {}; res.headers.forEach((v, k) => { responseHeaders[k] = v; }); const responseBody = await res.text(); return { status: res.status, statusText: res.statusText, headers: responseHeaders, body: responseBody }; }).catch(e => ({ status: 0, statusText: e.message ?? 'Network error', headers: {}, body: '' })); })()`;

  const response = await context.cdp.evaluate(script, sessionId);
  context.setOutput('response', response);
};
