import { useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode } from "./custom-nodes";
import { workflowToReactFlow, reactFlowToWorkflow } from "./lib/workflow-converter";
import type { WorkflowDefinition } from "@browsermesh/workflow";
import type { RFNode, RFEdge } from "./lib/workflow-converter";

const nodeTypes = { workflowNode: WorkflowNode };

export type WorkflowCanvasProps = {
  workflow?: WorkflowDefinition;
  onChange?: (workflow: WorkflowDefinition) => void;
  readonly?: boolean;
  onInit?: (instance: ReactFlowInstance<RFNode, RFEdge>) => void;
  onSelectNode?: (nodeId: string | null) => void;
};

export function WorkflowCanvas({ workflow, onChange, readonly, onInit, onSelectNode }: WorkflowCanvasProps) {
  const rafRef = useRef<number | null>(null);

  const initial = useMemo(() => workflow ? workflowToReactFlow(workflow) : { nodes: [], edges: [] }, [workflow]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  const instanceRef = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);

  const handleInit = useCallback((instance: ReactFlowInstance<RFNode, RFEdge>) => {
    instanceRef.current = instance;
    onInit?.(instance);
  }, [onInit]);

  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
    rafRef.current = requestAnimationFrame(() => {
      instanceRef.current?.fitView({ duration: 200 });
    });
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [workflow]);

  const emitChange = useCallback((newNodes: typeof nodes, newEdges: typeof edges) => {
    if (!onChange) return;
    const wf = reactFlowToWorkflow(newNodes, newEdges, workflow?.id, workflow?.name);
    onChange(wf);
  }, [onChange, workflow]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: RFNode) => {
    onSelectNode?.(node.id);
  }, [onSelectNode]);

  const handlePaneClick = useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);

  const onConnect = useCallback((connection: Connection) => {
    if (readonly) return;
    setEdges((eds) => {
      const newEdges = addEdge({ ...connection, type: "smoothstep" }, eds);
      emitChange(nodes, newEdges);
      return newEdges;
    });
  }, [readonly, setEdges, emitChange, nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={readonly ? undefined : onNodesChange}
      onEdgesChange={readonly ? undefined : onEdgesChange}
      onConnect={onConnect}
      onInit={handleInit}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      minZoom={0.3}
      maxZoom={2}
      deleteKeyCode={readonly ? undefined : "Delete"}
      className="bg-gray-50"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
      <Controls />
      <MiniMap
        nodeStrokeColor="#6b7280"
        nodeColor="#fff"
        maskColor="rgba(0,0,0,0.1)"
        className="border rounded-md shadow-sm"
      />
    </ReactFlow>
  );
}
