import type { NodeHandler } from "../types.js";

export const ifHandler: NodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const condition = inputs.condition;

  if (condition) {
    if (executeSubgraph) {
      yield* executeSubgraph("true");
    }
  } else {
    if (executeSubgraph) {
      yield* executeSubgraph("false");
    }
  }
};
