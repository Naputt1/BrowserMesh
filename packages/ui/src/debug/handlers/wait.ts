import type { DebugNodeHandler } from '../types';

export const waitHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const durationMs = config.durationMs as number | undefined;
  const selector = config.selector as string | undefined;

  if (selector) {
    const timeout = (config.timeoutMs as number) ?? 10000;
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const visible = await context.cdp.evaluate(
        `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? el.offsetParent !== null : false; })()`,
        sessionId,
      );
      if (visible) return;
      await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error(`Timeout waiting for selector: ${selector}`);
  } else if (durationMs != null) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
