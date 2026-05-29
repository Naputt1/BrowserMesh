import type { NodeHandler } from "../types.js";

export const continueHandler: NodeHandler = async function* (node, context) {
  if (context.controlSignal) {
    context.controlSignal.value = "continue";
  }
};
