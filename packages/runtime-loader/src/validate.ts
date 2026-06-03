import type { WorkflowIR, WorkflowNode, WorkflowEdge } from '@browsermesh/workflow';

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowValidationError';
  }
}

export function validateWorkflowIR(value: unknown): WorkflowIR {
  if (!value || typeof value !== 'object') {
    throw new WorkflowValidationError('WorkflowIR must be a non-null object');
  }

  const obj = value as Record<string, unknown>;

  if (typeof obj.id !== 'string' || !obj.id) {
    throw new WorkflowValidationError('WorkflowIR must have a non-empty string id');
  }

  if (!Array.isArray(obj.nodes)) {
    throw new WorkflowValidationError('WorkflowIR.nodes must be an array');
  }

  if (!Array.isArray(obj.edges)) {
    throw new WorkflowValidationError('WorkflowIR.edges must be an array');
  }

  const nodeIds = new Set<string>();

  for (let i = 0; i < obj.nodes.length; i++) {
    const node = obj.nodes[i] as Record<string, unknown>;
    if (typeof node.id !== 'string') {
      throw new WorkflowValidationError(`nodes[${i}] is missing a string id`);
    }
    nodeIds.add(node.id);

    const validTypes = [
      'start', 'end', 'navigate', 'click', 'type', 'wait', 'scroll',
      'select', 'extract', 'output', 'loop', 'custom', 'fetch', 'listen',
      'state', 'page', 'if', 'switch', 'and', 'or', 'not', 'break',
      'compare', 'continue',
    ];
    if (!validTypes.includes(node.type as string)) {
      throw new WorkflowValidationError(
        `nodes[${i}] has unknown type "${node.type}". Valid types: ${validTypes.join(', ')}`,
      );
    }
  }

  for (let i = 0; i < obj.edges.length; i++) {
    const edge = obj.edges[i] as Record<string, unknown>;
    if (typeof edge.id !== 'string') {
      throw new WorkflowValidationError(`edges[${i}] is missing a string id`);
    }
    if (!nodeIds.has(edge.source as string)) {
      throw new WorkflowValidationError(
        `edges[${i}] references unknown source node "${edge.source}"`,
      );
    }
    if (!nodeIds.has(edge.target as string)) {
      throw new WorkflowValidationError(
        `edges[${i}] references unknown target node "${edge.target}"`,
      );
    }
  }

  return value as WorkflowIR;
}
