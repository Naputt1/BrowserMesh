import type { DebugNodeHandler } from '../types';

export const ifHandler: DebugNodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const condition = inputs.condition as boolean | undefined;
  if (condition && executeSubgraph) {
    yield* executeSubgraph('true');
  } else if (!condition && executeSubgraph) {
    yield* executeSubgraph('false');
  }
};
