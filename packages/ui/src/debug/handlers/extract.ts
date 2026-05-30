import type { DebugNodeHandler } from '../types';

export const extractHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const property = (config.property as string) ?? 'text';
  const attribute = config.attribute as string | undefined;
  const element = inputs.element as { locator: string } | undefined;
  const selector = element?.locator ?? config.selector as string | undefined;
  if (!selector) throw new Error('extract node requires an element input');

  let expression: string;
  switch (property) {
    case 'text':
      expression = `document.querySelector(${JSON.stringify(selector)})?.textContent ?? null`;
      break;
    case 'attribute':
      if (!attribute) throw new Error('extract node requires an attribute name for attribute extraction');
      expression = `document.querySelector(${JSON.stringify(selector)})?.getAttribute(${JSON.stringify(attribute)}) ?? null`;
      break;
    case 'value':
      expression = `document.querySelector(${JSON.stringify(selector)})?.value ?? null`;
      break;
    case 'html':
      expression = `document.querySelector(${JSON.stringify(selector)})?.innerHTML ?? null`;
      break;
    case 'outerHtml':
      expression = `document.querySelector(${JSON.stringify(selector)})?.outerHTML ?? null`;
      break;
    default:
      throw new Error(`Unknown property: ${property}`);
  }

  const value = await context.cdp.evaluate(expression, sessionId);
  context.setOutput('value', value);
};
