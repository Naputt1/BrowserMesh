import type { WorkflowEvent } from "@browsermesh/workflow";
import type { NodeHandler, Locator } from "../types.js";

export const loopHandler: NodeHandler = async function* (node, context, executeChildren) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;
  const childNodeIds = (config.childNodeIds as string[]) ?? [];

  if (!selector) {
    throw new Error("loop node requires a selector in config");
  }

  const elements: Locator[] = await context.page.locator(selector).all();

  for (let i = 0; i < elements.length; i++) {
    const element = elements[i];
    yield* executeChildren(childNodeIds, { currentElement: element });
  }
};
