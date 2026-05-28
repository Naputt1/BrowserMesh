import type { NodeHandler } from "../types";

export const customHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const handlerName = config.handlerName as string | undefined;

  if (!handlerName) {
    throw new Error("custom node requires handlerName in config");
  }

  const handler = context.getCustomHandler(handlerName);
  if (!handler) {
    throw new Error(`Unknown custom handler: ${handlerName}`);
  }

  await handler(config, context);
};
