import type { NodeHandler } from '../types.js';

export const breakHandler: NodeHandler = async function* (node, context) {
  if (context.controlSignal) {
    context.controlSignal.value = 'break';
  }
};
