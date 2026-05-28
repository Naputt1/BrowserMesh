import type { NodeHandler } from "../types";

export const navigateHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const url = config.url as string | undefined;
  if (!url) {
    throw new Error("navigate node requires a url in config");
  }
  const waitUntil = config.waitUntil as string | undefined;
  await context.page.goto(url, waitUntil ? { waitUntil } : undefined);
};
