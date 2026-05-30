import type { DebugNodeHandler } from '../types';

export const compareHandler: DebugNodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const operation = (config.operation as string) ?? 'eq';
  const left = inputs.left;
  const right = inputs.right;
  let result = false;

  switch (operation) {
    case 'eq':
      result = left === right;
      break;
    case 'neq':
      result = left !== right;
      break;
    case 'gt':
      result = (left as number) > (right as number);
      break;
    case 'gte':
      result = (left as number) >= (right as number);
      break;
    case 'lt':
      result = (left as number) < (right as number);
      break;
    case 'lte':
      result = (left as number) <= (right as number);
      break;
    case 'contains':
      result = String(left).includes(String(right));
      break;
    case 'startsWith':
      result = String(left).startsWith(String(right));
      break;
    case 'endsWith':
      result = String(left).endsWith(String(right));
      break;
    case 'regex':
      try {
        result = new RegExp(String(right)).test(String(left));
      } catch {
        result = false;
      }
      break;
    case 'exists':
      result = left != null;
      break;
    case 'empty':
      result = left == null || left === '' || (Array.isArray(left) && left.length === 0);
      break;
    default:
      result = false;
  }

  context.setOutput('result', result);
};
