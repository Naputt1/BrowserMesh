import type { NodeHandler } from '../types.js';

export const scrollHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const pageKey = inputs.pageKey as string | undefined;
  const page = context.pageManager && pageKey ? context.pageManager.getPage(pageKey) : context.page;
  const direction = (config.direction as string) ?? 'down';
  if (direction === 'to') {
    const selector = config.selector as string | undefined;
    if (!selector) throw new Error("scroll node requires a selector when direction is 'to'");
    await (context.currentElement ?? page).locator(selector).first().waitFor();
    await page.evaluate(
      `document.querySelector('${selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')?.scrollIntoView({ behavior: 'smooth', block: 'center' })`,
    );
  } else {
    await page.evaluate(`window.scrollBy(0, window.innerHeight / ${direction === 'up' ? -2 : 2})`);
  }
};
