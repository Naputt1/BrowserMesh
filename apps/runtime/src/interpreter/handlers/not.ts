import type { NodeHandler } from '../types.js';

export const notHandler: NodeHandler = async function* (node, context, inputs) {
  const result = !Boolean(inputs.value);
  context.setOutput('result', result);
};
