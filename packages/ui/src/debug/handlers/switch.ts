import type { DebugNodeHandler } from '../types';

export const switchHandler: DebugNodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const config = node.config ?? {};
  const cases = (config.cases as Array<{ value: unknown; label?: string }>) ?? [];
  const switchValue = inputs.value;
  const defaultCase = cases.find((c) => c.label === 'default');
  const matched = cases.find((c) => c.label !== 'default' && c.value === switchValue);

  if (matched && executeSubgraph) {
    yield* executeSubgraph(matched.label ?? String(matched.value));
  } else if (defaultCase && executeSubgraph) {
    yield* executeSubgraph('default');
  }
};
