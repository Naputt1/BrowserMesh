import type { DebugNodeHandler } from '../types';

export const continueHandler: DebugNodeHandler = async function* (_node, context) {
  if (context.controlSignal) {
    context.controlSignal.value = 'continue';
  }
};
