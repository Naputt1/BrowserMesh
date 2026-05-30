import type { DebugNodeHandler } from '../types';

export const selectHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  const element = inputs.element as { locator: string } | undefined;
  const selector = element?.locator ?? (config.selector as string | undefined);
  const value = (config.value as string) ?? (inputs.value as string | undefined);
  const optionValue = (config.optionValue as string) ?? (inputs.optionValue as string | undefined);
  const optionLabel = (config.optionLabel as string) ?? (inputs.optionLabel as string | undefined);
  if (!selector || (value == null && optionValue == null && optionLabel == null)) {
    throw new Error('select node requires a selector and a value/option');
  }

  const escapedSelector = JSON.stringify(selector);
  const selectExpr = optionValue
    ? `document.querySelector(${escapedSelector}).value = ${JSON.stringify(optionValue)}`
    : optionLabel
      ? `(() => { const s = document.querySelector(${escapedSelector}); [...s.options].find(o => o.text === ${JSON.stringify(optionLabel)})?.selected = true; })()`
      : `document.querySelector(${escapedSelector}).value = ${JSON.stringify(value)}`;

  await context.cdp.evaluate(
    `(() => { const el = document.querySelector(${escapedSelector}); if (el) { ${selectExpr}; el.dispatchEvent(new Event('change', { bubbles: true })); } })()`,
    sessionId,
  );
};
