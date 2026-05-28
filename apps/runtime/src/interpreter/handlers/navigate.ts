import type { NodeHandler } from "../types.js";

export const navigateHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const url = (inputs.url as string) ?? (config.url as string);
  if (!url) {
    throw new Error("navigate node requires a url in config or connected to URL input");
  }
  const pageKey = inputs.pageKey as string | undefined;
  const page = (context.pageManager && pageKey) ? context.pageManager.getPage(pageKey) : context.page;
  const waitUntil = config.waitUntil as string | undefined;
  await page.goto(url, waitUntil ? { waitUntil } : undefined);
};
