import type { WorkflowEvent } from '@browsermesh/workflow';
import type { NodeHandler } from '../types.js';

export const outputHandler: NodeHandler = async function* (node, context, inputs) {
  const config = node.config ?? {};
  const propertyPath = config.propertyPath as string | undefined;
  const value = inputs.value;
  const index = inputs.index as number | undefined;

  if (!propertyPath) {
    throw new Error('output node requires propertyPath in config');
  }

  let resolvedPath = propertyPath;
  if (index !== undefined) {
    resolvedPath = propertyPath.includes('[]')
      ? propertyPath.replace('[]', `[${index}]`)
      : `${propertyPath}[${index}]`;
  }

  yield {
    type: 'partial_data',
    taskId: context.taskId,
    timestamp: new Date().toISOString(),
    path: resolvedPath,
    value,
  } as WorkflowEvent;
};
