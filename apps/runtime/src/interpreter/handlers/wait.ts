import type { NodeHandler } from "../types.js";

export const waitHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const durationMs = config.durationMs as number | undefined;
  const selector = config.selector as string | undefined;

  if (selector) {
    const target = context.currentElement ?? context.page;
    const locator = target.locator(selector);
    await locator.waitFor({ state: "visible", timeout: config.timeoutMs as number | undefined });
  } else if (durationMs !== undefined) {
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  } else {
    throw new Error("wait node requires either durationMs or selector in config");
  }
};
