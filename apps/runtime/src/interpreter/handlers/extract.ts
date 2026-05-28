import type { WorkflowEvent } from "@browsermesh/workflow";
import type { NodeHandler } from "../types.js";

export const extractHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const selector = config.selector as string | undefined;
  const property = (config.property as string) ?? "text";
  const name = config.name as string | undefined;

  if (!selector) {
    throw new Error("extract node requires a selector in config");
  }

  const target = context.currentElement ?? context.page;
  const locator = target.locator(selector);

  let value: unknown;
  switch (property) {
    case "text":
      value = await locator.textContent();
      break;
    case "attribute": {
      const attr = config.attribute as string | undefined;
      if (!attr) throw new Error("extract node with property 'attribute' requires attribute name in config");
      value = await locator.getAttribute(attr);
      break;
    }
    case "value":
      value = await locator.inputValue();
      break;
    default:
      value = await locator.textContent();
  }

  const event: WorkflowEvent = {
    type: "partial_data",
    taskId: context.taskId,
    timestamp: new Date().toISOString(),
    path: name ?? selector,
    value,
  };
  yield event;
};
