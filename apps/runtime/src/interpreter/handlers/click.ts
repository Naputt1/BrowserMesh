import type { NodeHandler } from "../types.js";

export const clickHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const pageKey = inputs.pageKey as string | undefined;
  const page = (context.pageManager && pageKey) ? context.pageManager.getPage(pageKey) : context.page;
  let element = inputs.element as { locator: string } | undefined;
  if (!element && config.selector) {
    element = { locator: config.selector as string };
  }
  if (!element) {
    throw new Error("click node requires an element input or a selector in config");
  }
  await page.locator(element.locator).click();
};
