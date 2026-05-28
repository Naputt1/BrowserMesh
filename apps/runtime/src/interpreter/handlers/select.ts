import type { NodeHandler } from "../types.js";

export const selectHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const pageKey = inputs.pageKey as string | undefined;
  const page = (context.pageManager && pageKey) ? context.pageManager.getPage(pageKey) : context.page;
  const selector = config.selector as string | undefined;
  const mode = (config.mode as string) ?? "one";
  const index = (config.index as number) ?? 0;

  if (!selector) {
    throw new Error("select node requires a selector in config");
  }

  const target = (inputs.element ?? context.currentElement ?? page) as {
    locator: (sel: string) => any;
  };
  const locator = target.locator(selector);

  if (mode === "all") {
    const elements = await locator.all();
    context.setOutput("element", elements);
  } else {
    const el = locator.nth(index);
    context.setOutput("element", el);
  }
};
