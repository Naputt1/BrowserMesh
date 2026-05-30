import type { DebugNodeHandler } from '../types';

export const clickHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const element = inputs.element as { locator: string } | undefined;
  const selector = element?.locator ?? (config.selector as string | undefined);
  if (!selector) throw new Error('click node requires an element input or a selector in config');

  await context.cdp.evaluate(
    `document.querySelector(${JSON.stringify(selector)})?.click()`,
    sessionId,
  );
};
