import type { NodeHandler } from '../types.js';

export const compareHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const operator = (config.operator as string) ?? 'equals';
  const left = inputs.left;
  const right = inputs.right;

  let result: boolean;
  switch (operator) {
    case 'equals':
    case '==':
      result = left === right;
      break;
    case 'not_equals':
    case '!=':
      result = left !== right;
      break;
    case 'greater_than':
    case '>':
      result = (left as number) > (right as number);
      break;
    case 'less_than':
    case '<':
      result = (left as number) < (right as number);
      break;
    case 'greater_than_or_equal':
    case '>=':
      result = (left as number) >= (right as number);
      break;
    case 'less_than_or_equal':
    case '<=':
      result = (left as number) <= (right as number);
      break;
    case 'contains':
      result = String(left).includes(String(right));
      break;
    case 'starts_with':
      result = String(left).startsWith(String(right));
      break;
    case 'ends_with':
      result = String(left).endsWith(String(right));
      break;
    default:
      result = left === right;
  }

  context.setOutput('result', result);
};
