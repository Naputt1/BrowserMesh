import type { NodeHandler } from '../types.js';

type ElementLike = {
  locator: ((sel: string) => any) | string;
  textContent?: () => Promise<string>;
  getAttribute?: (name: string) => Promise<string | null>;
  inputValue?: () => Promise<string>;
};

function resolveElement(el: ElementLike, page: any): any {
  if (typeof el.locator === 'function') {
    return el;
  }
  return page.locator(el.locator);
}

export const extractHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const pageKey = inputs.pageKey as string | undefined;
  const page = context.pageManager && pageKey ? context.pageManager.getPage(pageKey) : context.page;
  const property = (config.property as string) ?? 'text';
  const attribute = config.attribute as string | undefined;
  const element =
    (inputs.element as ElementLike | undefined) ??
    (context.currentElement as ElementLike | undefined);
  if (!element) {
    throw new Error('extract node requires an element input');
  }
  const target = resolveElement(element, page);
  let value: unknown;
  switch (property) {
    case 'text':
      value = await target.textContent();
      break;
    case 'attribute':
      if (!attribute) throw new Error('extract node requires an attribute name');
      value = await target.getAttribute(attribute);
      break;
    case 'value':
      value = await target.inputValue();
      break;
    default:
      throw new Error(`Unknown property: ${property}`);
  }
  context.setOutput('value', value);
};
