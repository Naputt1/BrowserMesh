import type { NodeHandler, Locator } from "../types.js";

export const loopHandler: NodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const config = node.config ?? {};
  const items = inputs.items as Locator[] | undefined;

  if (!items || !Array.isArray(items)) {
    throw new Error("loop node requires 'items' input (array of elements)");
  }

  const maxIterations = config.maxIterations as number | undefined;
  const limit = maxIterations ?? items.length;

  for (let i = 0; i < Math.min(items.length, limit); i++) {
    context.setOutput("index", i);
    const item = items[i];
    if (executeSubgraph) {
      yield* executeSubgraph("body", { currentElement: item, loopIndex: i });
    }
  }
};
