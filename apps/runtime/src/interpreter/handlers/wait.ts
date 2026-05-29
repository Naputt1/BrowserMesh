import type { NodeHandler } from '../types.js';

export const waitHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const pageKey = inputs.pageKey as string | undefined;
  const page = context.pageManager && pageKey ? context.pageManager.getPage(pageKey) : context.page;
  const durationMs = config.durationMs as number | undefined;
  const selector = config.selector as string | undefined;

  if (selector) {
    await (context.currentElement ?? page).locator(selector).waitFor({ state: 'visible' });
  } else if (durationMs != null) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};
