import type { NodeHandler } from '../types.js';

export const andHandler: NodeHandler = async function* (node, context, inputs) {
  const result = Boolean(inputs.a) && Boolean(inputs.b);
  context.setOutput('result', result);
};
