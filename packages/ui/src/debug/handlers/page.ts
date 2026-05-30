import type { DebugNodeHandler, DebugSessionInfo } from '../types';

export const pageHandler: DebugNodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const action = (config.action as string) ?? 'create';
  const pageId = config.pageId as string;

  if (!pageId) throw new Error("page node requires a pageId in config");

  switch (action) {
    case 'create': {
      const { targetId, sessionId } = await context.cdp.createPage();
      context.pageSessions.set(pageId, { targetId, sessionId });
      break;
    }
    case 'close': {
      const info = context.pageSessions.get(pageId);
      if (!info) throw new Error(`Page not found: ${pageId}`);
      await context.cdp.closePage(info.targetId);
      context.pageSessions.delete(pageId);
      break;
    }
    case 'select': {
      const info = context.pageSessions.get(pageId);
      if (!info) throw new Error(`Page not found: ${pageId}`);
      const newGetSession = (_pageKey?: string) => {
        if (_pageKey) {
          const found = context.pageSessions.get(_pageKey);
          return found?.sessionId ?? context.defaultSessionId;
        }
        return info.sessionId;
      };
      context.getSession = newGetSession;
      break;
    }
    default:
      throw new Error(`Unknown page action: ${action}`);
  }

  context.setOutput('pageKey', pageId);
};
