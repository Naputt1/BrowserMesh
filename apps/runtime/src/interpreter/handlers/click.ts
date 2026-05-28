import type { NodeHandler } from "../types";

export const clickHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;
  if (!selector) {
    throw new Error("click node requires a selector in config");
  }
  const target = context.currentElement ?? context.page;
  const locator = target.locator(selector);
  await locator.click();
};
