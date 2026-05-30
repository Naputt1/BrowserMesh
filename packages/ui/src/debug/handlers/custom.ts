import type { DebugNodeHandler } from '../types';

const customHandlers = new Map<string, (config: Record<string, unknown>, context: any) => Promise<unknown>>();

export function registerCustomHandler(name: string, handler: (config: Record<string, unknown>, context: any) => Promise<unknown>): void {
  customHandlers.set(name, handler);
}

export const customHandler: DebugNodeHandler = async function* (node, context) {
  const config = node.config ?? {};
  const handlerName = config.handlerName as string | undefined;
  if (!handlerName) throw new Error('custom node requires handlerName in config');

  const handler = customHandlers.get(handlerName);
  if (!handler) throw new Error(`Unknown custom handler: ${handlerName}`);

  await handler(config, context);
};

export function clearCustomHandlers(): void {
  customHandlers.clear();
}
