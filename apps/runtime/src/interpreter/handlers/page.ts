import type { NodeHandler } from "../types.js";

export const pageHandler: NodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const action = (config.action as string) ?? "create";
  const pageId = config.pageId as string;

  const pm = context.pageManager;
  if (!pm) {
    throw new Error("page node requires a PageManager (enable multi-page in global settings)");
  }

  switch (action) {
    case "create": {
      if (!pageId) throw new Error("page node with 'create' action requires a pageId");
      await pm.createPage(pageId);
      break;
    }
    case "close": {
      if (!pageId) throw new Error("page node with 'close' action requires a pageId");
      await pm.closePage(pageId);
      break;
    }
    case "select": {
      if (!pageId) throw new Error("page node with 'select' action requires a pageId");
      pm.switchDefault(pageId);
      break;
    }
    default:
      throw new Error(`Unknown page action: ${action}`);
  }

  context.setOutput("pageKey", pageId);
};
