import type { NodeHandler } from "../types.js";

export const extractHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const property = (config.property as string) ?? "text";
  const element = (inputs.element ?? context.currentElement) as any;

  if (!element) {
    throw new Error("extract node requires an element input");
  }

  let value: unknown;
  switch (property) {
    case "text":
      value = await element.textContent();
      break;
    case "attribute": {
      const attr = config.attribute as string | undefined;
      if (!attr) throw new Error("extract node with property 'attribute' requires attribute name in config");
      value = await element.getAttribute(attr);
      break;
    }
    case "value":
      value = await element.inputValue();
      break;
    default:
      value = await element.textContent();
  }

  context.setOutput("value", value);
};
