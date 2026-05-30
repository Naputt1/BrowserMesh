import type { DebugNodeHandler } from '../types';

export const outputHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const path = (config.path as string) ?? (inputs.index as string);
  const value = inputs.value;

  if (path != null && value !== undefined) {
    context.setOutput(path, value);
  }
};
