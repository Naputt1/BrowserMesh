import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  GlobalSettings,
  DataType,
  PinDescriptor,
} from '@browsermesh/workflow';
import { NODE_DEFINITIONS } from '@browsermesh/workflow';
import type { Node, Edge } from '@xyflow/react';

export type RFNode = Node<{
  label: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  pinDataTypes?: Record<string, DataType>;
  pageId?: string;
  multiPage?: boolean;
}>;
export type RFEdge = Edge;

const GRID = 20;

function snap(pos: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(pos.x / GRID) * GRID,
    y: Math.round(pos.y / GRID) * GRID,
  };
}

function getPinDataTypes(
  nodeType: NodeType,
  config: Record<string, unknown>,
): Record<string, DataType> | undefined {
  if (nodeType === 'select' && config.mode === 'all') {
    return { element: { kind: 'array' } };
  }
  return undefined;
}

export function workflowToReactFlow(
  wf: WorkflowDefinition,
  existingNodes?: RFNode[],
): { nodes: RFNode[]; edges: RFEdge[] } {
  const existingPositions = new Map(existingNodes?.map((n) => [n.id, n.position]));
  const existingSelected = new Map(existingNodes?.map((n) => [n.id, n.selected]));

  const multiPage = wf.settings?.multiPage ?? false;
  const nodes: RFNode[] = wf.nodes.map((n, i) => ({
    id: n.id,
    type: 'workflowNode',
    position: n.position
      ? snap(n.position)
      : (existingPositions.get(n.id) ?? { x: i * 280 + 60, y: 200 }),
    data: {
      label: n.label ?? n.type,
      nodeType: n.type,
      config: n.config ?? {},
      pinDataTypes: getPinDataTypes(n.type, n.config ?? {}),
      pageId: n.pageId,
      multiPage,
    },
    selected: existingSelected.get(n.id) ?? false,
  }));

  const edges: RFEdge[] = wf.edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle,
    target: e.target,
    targetHandle: e.targetHandle,
    type: 'smoothstep',
    style: getEdgeStyle(e.targetHandle),
  }));

  return { nodes, edges };
}

export function reactFlowToWorkflow(
  nodes: RFNode[],
  edges: RFEdge[],
  id?: string,
  name?: string,
  settings?: GlobalSettings,
): WorkflowDefinition {
  const wfNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    label: n.data.label,
    position: snap(n.position),
    config: n.data.config,
    pageId: n.data.pageId ?? undefined,
  }));

  const wfEdges: WorkflowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    sourceHandle: e.sourceHandle ?? 'flow',
    target: e.target,
    targetHandle: e.targetHandle ?? 'flow',
  }));

  return {
    id: id ?? crypto.randomUUID(),
    ...(name ? { name } : {}),
    ...(settings ? { settings } : {}),
    nodes: wfNodes,
    edges: wfEdges,
  };
}

export function getNodeColor(nodeType: NodeType): string {
  return NODE_DEFINITIONS[nodeType]?.color ?? '#6b7280';
}

export function getPinColor(type: string, name?: string): string {
  if (type === 'flow') return '#9ca3af';
  if (name === 'pageKey') return '#f97316';
  return '#3b82f6';
}

export function getEdgeStyle(targetHandle?: string): Record<string, unknown> {
  if (targetHandle === 'pageKey') {
    return { stroke: '#f97316', strokeWidth: 2 };
  }
  return {};
}

export function getNodeDef(type: NodeType) {
  return NODE_DEFINITIONS[type];
}

export function getPinDataType(
  node: RFNode | undefined,
  pin: PinDescriptor | undefined,
  handle: string,
): DataType | undefined {
  return node?.data.pinDataTypes?.[handle] ?? pin?.dataType;
}

export function isDataTypeAssignable(source?: DataType, target?: DataType): boolean {
  if (!target) return true;
  if (!source) return false;
  if (source.kind !== target.kind) return false;
  if (source.kind === 'array' && target.kind === 'array') {
    return isDataTypeAssignable(source.elementType, target.elementType);
  }
  if (source.kind === 'object' && target.kind === 'object') {
    if (!target.fields || target.fields.length === 0) return true;
    if (!source.fields) return false;
    return target.fields.every((tf) => {
      const sf = source.fields!.find((f) => f.name === tf.name);
      return sf && isDataTypeAssignable(sf.type, tf.type);
    });
  }
  return true;
}
