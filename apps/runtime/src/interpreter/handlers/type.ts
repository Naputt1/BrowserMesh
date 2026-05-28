import type { NodeHandler } from "../types.js";

export const typeHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;
  const value = config.value as string | undefined;
  if (!selector || value === undefined) {
    throw new Error("type node requires selector and value in config");
  }
  const target = context.currentElement ?? context.page;
  const locator = target.locator(selector);
  await locator.fill(value);
};
