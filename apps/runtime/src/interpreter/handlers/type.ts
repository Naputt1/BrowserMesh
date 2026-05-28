import type { NodeHandler } from "../types.js";

export const typeHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const value = config.value as string | undefined;
  if (value === undefined) {
    throw new Error("type node requires a value in config");
  }

  if (inputs.element) {
    const el = inputs.element as { fill: (v: string) => Promise<void> };
    await el.fill(value);
  } else {
    const selector = config.selector as string | undefined;
    if (!selector) {
      throw new Error("type node requires either an element input or a selector in config");
    }
    const target = context.currentElement ?? context.page;
    const locator = target.locator(selector);
    await locator.fill(value);
  }
};
