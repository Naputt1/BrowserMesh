import type { NodeHandler } from "../types.js";

export const scrollHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;

  if (selector) {
    const target = context.currentElement ?? context.page;
    const locator = target.locator(selector);
    await locator.first().waitFor({ state: "visible" });
    await context.page.evaluate(`document.querySelector('${selector.replace(/'/g, "\\'")}').scrollIntoView()`);
  } else {
    const x = (config.x as number) ?? 0;
    const y = (config.y as number) ?? 0;
    await context.page.evaluate(`window.scrollTo(${x}, ${y})`);
  }
};
