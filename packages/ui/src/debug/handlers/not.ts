import type { DebugNodeHandler } from '../types';

export const notHandler: DebugNodeHandler = async function* (_node, context, inputs) {
  context.setOutput('result', !Boolean(inputs.value));
};
