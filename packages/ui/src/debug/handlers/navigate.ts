import type { DebugNodeHandler } from '../types';

export const navigateHandler: DebugNodeHandler = async function* (_node, context, inputs) {
  const config = _node.config ?? {};
  const url = (inputs.url as string) ?? (config.url as string);
  if (!url) throw new Error('navigate node requires a url in config or connected to URL input');

  const sessionId = context.getSession(inputs.pageKey as string | undefined);
  await context.cdp.navigate(url, sessionId);
};
