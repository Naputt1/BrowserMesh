import type { NodeHandler } from "../types.js";

function resolveVars(template: string, variables: Record<string, string>): string {
  return template.replace(/\$\{(\w+)\}/g, (_, name) => variables[name] ?? `\${${name}}`);
}

export const fetchHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const method = (config.method as string) ?? "GET";
  let url = (inputs.url as string) ?? (config.url as string);
  if (!url) throw new Error("fetch node requires a url in config or connected to URL input");
  const pageKey = inputs.pageKey as string | undefined;
  const page = (context.pageManager && pageKey) ? context.pageManager.getPage(pageKey) : context.page;

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
    .join("&");
  if (queryString) {
    url += (url.includes("?") ? "&" : "?") + queryString;
  }

  const headers: Record<string, string> = {};
  for (const h of rawHeaders) {
    if (h.key) headers[h.key] = resolveVars(h.value, variables);
  }

  if (body) {
    body = resolveVars(body, variables);
  }

  if (config.actLikeNavigation !== false) {
    const timing = context.globalSettings?.timing;
    if (timing?.minDelayMs != null) {
      const range = (timing.maxDelayMs ?? timing.minDelayMs) - timing.minDelayMs;
      const delay = timing.minDelayMs + (range > 0 ? Math.random() * range : 0);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const fetchOpts: Record<string, unknown> = { method, headers };
  if (body && method !== "GET" && method !== "HEAD") {
    fetchOpts.body = body;
  }

  const script = `
    (async () => {
      try {
        const res = await fetch(${JSON.stringify(url)}, ${JSON.stringify(fetchOpts)});
        const responseHeaders = {};
        res.headers.forEach((v, k) => { responseHeaders[k] = v; });
        const body = await res.text();
        return {
          status: res.status,
          statusText: res.statusText,
          headers: responseHeaders,
          body: body
        };
      } catch (e) {
        return {
          status: 0,
          statusText: e.message ?? 'Network error',
          headers: {},
          body: ''
        };
      }
    })()
  `;

  const response = await page.evaluate(script);

  context.setOutput("response", response);
};
