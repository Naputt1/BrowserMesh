import type { DebugNodeHandler } from '../types';

export const endHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const showOutputs = config.showOutputs !== false;
  if (showOutputs && Object.keys(inputs).length > 0) {
    for (const [key, value] of Object.entries(inputs)) {
      context.setOutput(key, value);
    }
  }
};
