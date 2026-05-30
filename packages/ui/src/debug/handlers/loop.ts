import type { WorkflowEvent } from '@browsermesh/workflow';
import type { DebugNodeHandler } from '../types';

export const loopHandler: DebugNodeHandler = async function* (node, context, inputs, executeSubgraph) {
  const items = inputs.items as unknown[] | undefined;
  if (!items || !Array.isArray(items)) {
    context.setOutput('index', -1);
    context.setOutput('item', undefined);
    return;
  }

  for (let i = 0; i < items.length; i++) {
    if (context.controlSignal?.value === 'break') {
      context.controlSignal.value = undefined;
      break;
    }
    if (context.controlSignal?.value === 'continue') {
      context.controlSignal.value = undefined;
      continue;
    }

    context.setOutput('index', i);
    context.setOutput('item', items[i]);

    if (executeSubgraph) {
      yield* executeSubgraph('body', {
        ...context,
        loopIndex: i,
      });
    }
  }

  context.setOutput('index', -1);
  context.setOutput('item', undefined);
};
