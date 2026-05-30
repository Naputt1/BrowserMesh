import type { DebugNodeHandler } from '../types';

export const typeHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const value = config.value as string | undefined;
  const element = inputs.element as { locator: string } | undefined;
  const selector = element?.locator ?? (config.selector as string | undefined);
  if (!selector) throw new Error('type node requires an element input or a selector in config');
  if (value == null) throw new Error('type node requires a value in config');

  const escapedValue = JSON.stringify(value);
  await context.cdp.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (el) { el.value = ${escapedValue}; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } })()`,
    sessionId,
  );
};
