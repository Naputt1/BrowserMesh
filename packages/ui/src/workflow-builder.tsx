import { useState, useCallback, useRef, useEffect } from "react";
import type { ReactFlowInstance } from "@xyflow/react";
import type { WorkflowDefinition, WorkflowEvent } from "@browsermesh/workflow";
import { WorkflowCanvas } from "./workflow-canvas";
import { Toolbar } from "./toolbar";
import { NodeConfigPanel } from "./node-config-panel";
import type { RFNode, RFEdge } from "./lib/workflow-converter";

export type WorkflowBuilderProps = {
  readonly workflow?: WorkflowDefinition;
  readonly events?: readonly WorkflowEvent[];
  readonly onWorkflowChange?: (workflow: WorkflowDefinition) => void;
};

let nodeCounter = 0;

export function WorkflowBuilder({ workflow, onWorkflowChange }: WorkflowBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowDefinition | undefined>(workflow);
  const reactFlowRef = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);

  useEffect(() => {
    if (workflow !== undefined) {
      setWorkflowState(workflow);
    }
  }, [workflow]);

  const handleChange = useCallback((wf: WorkflowDefinition) => {
    setWorkflowState(wf);
    onWorkflowChange?.(wf);
  }, [onWorkflowChange]);

  const handleAddNode = useCallback((type: string) => {
    const id = `node_${++nodeCounter}`;
    const existing = workflowState ?? { id: crypto.randomUUID(), nodes: [], edges: [] };
    const newNode = {
      id,
      type: type as WorkflowDefinition["nodes"][number]["type"],
      label: type.charAt(0).toUpperCase() + type.slice(1),
      config: {},
    };
    const updated = {
      ...existing,
      nodes: [...existing.nodes, newNode],
    };
    handleChange(updated);
  }, [workflowState, handleChange]);

  const handleUpdateNode = useCallback((id: string, updates: { label?: string; config?: Record<string, unknown> }) => {
    if (!workflowState) return;
    const updated = {
      ...workflowState,
      nodes: workflowState.nodes.map((n) =>
        n.id === id ? { ...n, ...updates, config: updates.config ?? n.config } : n
      ),
    };
    handleChange(updated);
  }, [workflowState, handleChange]);

  const handleDeleteNode = useCallback((id: string) => {
    if (!workflowState) return;
    const updated = {
      ...workflowState,
      nodes: workflowState.nodes.filter((n) => n.id !== id),
      edges: workflowState.edges.filter((e) => e.source !== id && e.target !== id),
    };
    setSelectedNodeId(null);
    handleChange(updated);
  }, [workflowState, handleChange]);

  const selectedNode = workflowState
    ? (() => {
        const n = workflowState.nodes.find((n) => n.id === selectedNodeId);
        return n ? { id: n.id, label: n.label ?? n.type, type: n.type, config: n.config ?? {} } : null;
      })()
    : null;

  const handleExport = useCallback(() => {
    if (!workflowState) return;
    const blob = new Blob([JSON.stringify(workflowState, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflow-${workflowState.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workflowState]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const wf = JSON.parse(text) as WorkflowDefinition;
        handleChange(wf);
      } catch {
        alert("Invalid workflow JSON");
      }
    };
    input.click();
  }, [handleChange]);

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        onAddNode={handleAddNode}
        onZoomIn={() => reactFlowRef.current?.zoomIn()}
        onZoomOut={() => reactFlowRef.current?.zoomOut()}
        onFitView={() => reactFlowRef.current?.fitView({ duration: 200 })}
        onExport={handleExport}
        onImport={handleImport}
      />
        <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <WorkflowCanvas
            workflow={workflowState}
            onChange={handleChange}
            onInit={(instance) => { reactFlowRef.current = instance; }}
            onSelectNode={setSelectedNodeId}
          />
        </div>
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDelete={handleDeleteNode}
        />
      </div>
    </div>
  );
}
