import type { WorkflowDefinition, WorkflowNode, WorkflowEdge } from "@browsermesh/workflow";
import type { Node, Edge } from "@xyflow/react";

export type RFNode = Node<{ label: string; nodeType: WorkflowNode["type"]; config: Record<string, unknown> }>;
export type RFEdge = Edge;

const nodeTypeColors: Record<WorkflowNode["type"], string> = {
  navigate: "#3b82f6",
  click: "#22c55e",
  type: "#f59e0b",
  wait: "#a855f7",
  scroll: "#64748b",
  extract: "#14b8a6",
  loop: "#f97316",
  custom: "#6b7280",
};

export function workflowToReactFlow(wf: WorkflowDefinition): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes: RFNode[] = wf.nodes.map((n, i) => ({
    id: n.id,
    type: "workflowNode",
    position: { x: 250, y: i * 120 + 50 },
    data: { label: n.label ?? n.type, nodeType: n.type, config: n.config ?? {} },
  }));

  const edges: RFEdge[] = wf.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
  }));

  return { nodes, edges };
}

export function reactFlowToWorkflow(nodes: RFNode[], edges: RFEdge[], id?: string, name?: string): WorkflowDefinition {
  const wfNodes: WorkflowNode[] = nodes.map((n) => ({
    id: n.id,
    type: n.data.nodeType,
    label: n.data.label,
    config: n.data.config,
  }));

  const wfEdges: WorkflowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
  }));

  return {
    id: id ?? crypto.randomUUID(),
    ...(name ? { name } : {}),
    nodes: wfNodes,
    edges: wfEdges,
  };
}

export function getNodeColor(nodeType: WorkflowNode["type"]): string {
  return nodeTypeColors[nodeType] ?? "#6b7280";
}
