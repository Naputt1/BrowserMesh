import type { DebugNodeHandler } from '../types';

export const andHandler: DebugNodeHandler = async function* (_node, context, inputs) {
  context.setOutput('result', Boolean(inputs.a) && Boolean(inputs.b));
};
