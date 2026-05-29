import type { NodeHandler } from '../types.js';

export const stateHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const operation = (config.operation as string) ?? 'get';
  const key = config.key as string;
  const defaultValue = config.defaultValue;
  let value = inputs.value;

  const store = context.stateStore;
  if (!store) {
    throw new Error('state node requires a GlobalStateStore (not available in this context)');
  }

  if (value === undefined) {
    value = config.value;
  }

  switch (operation) {
    case 'get': {
      const result = store.get(key);
      context.setOutput('value', result ?? defaultValue ?? null);
      break;
    }
    case 'set': {
      store.set(key, value);
      context.setOutput('value', value);
      break;
    }
    case 'increment': {
      const by = typeof value === 'number' ? value : 1;
      const result = store.increment(key, by);
      context.setOutput('value', result);
      break;
    }
    case 'delete': {
      store.delete(key);
      context.setOutput('value', null);
      break;
    }
    case 'commit': {
      await store.commit();
      context.setOutput('value', true);
      break;
    }
    default:
      throw new Error(`Unknown state operation: ${operation}`);
  }
};
