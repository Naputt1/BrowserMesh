import type { DebugNodeHandler } from '../types';

export const scrollHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const element = inputs.element as { locator: string } | undefined;
  const selector = element?.locator ?? (config.selector as string | undefined);
  if (!selector) {
    const x = (config.x as number) ?? 0;
    const y = (config.y as number) ?? 0;
    await context.cdp.evaluate(`window.scrollTo(${x}, ${y})`, sessionId);
    return;
  }
  await context.cdp.evaluate(
    `document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ behavior: 'instant', block: 'center' })`,
    sessionId,
  );
};
