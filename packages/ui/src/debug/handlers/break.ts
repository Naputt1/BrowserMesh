import type { DebugNodeHandler } from '../types';

export const breakHandler: DebugNodeHandler = async function* (_node, context) {
  if (context.controlSignal) {
    context.controlSignal.value = 'break';
  }
};
