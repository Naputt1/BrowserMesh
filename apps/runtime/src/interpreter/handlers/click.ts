import type { NodeHandler } from "../types.js";

export const clickHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;

  if (inputs.element) {
    const el = inputs.element as { click: () => Promise<void> };
    await el.click();
  } else if (selector) {
    const target = context.currentElement ?? context.page;
    const locator = target.locator(selector);
    await locator.click();
  } else {
    throw new Error("click node requires either an element input or a selector in config");
  }
};
