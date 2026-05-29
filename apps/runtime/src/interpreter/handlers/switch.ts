import type { NodeHandler } from "../types.js";

export const switchHandler: NodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const config = node.config ?? {};
  const cases = config.cases as Array<{ label: string; value: string }> | undefined;
  const value = inputs.value;

  if (cases && Array.isArray(cases)) {
    const idx = cases.findIndex((c) => c.value === value);
    if (idx >= 0 && executeSubgraph) {
      yield* executeSubgraph(`case_${idx}`);
      return;
    }
  }

  if (executeSubgraph) {
    yield* executeSubgraph("default");
  }
};
