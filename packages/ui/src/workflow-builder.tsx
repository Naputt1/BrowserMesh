import { useState, useCallback, useRef, useEffect } from 'react';
import type { ReactFlowInstance } from '@xyflow/react';
import type {
  WorkflowDefinition,
  WorkflowNode,
  NodeType,
  GlobalSettings,
  WorkflowEvent,
} from '@browsermesh/sdk';
import { WorkflowCanvas } from './workflow-canvas';
import { Toolbar } from './toolbar';
import { NodeConfigPanel } from './node-config-panel';
import { GlobalSettingsPanel } from './global-settings-panel';
import type { RFNode, RFEdge } from './lib/workflow-converter';

export type WorkflowBuilderProps = {
  readonly workflow?: WorkflowDefinition;
  readonly events?: readonly WorkflowEvent[];
  readonly onWorkflowChange?: (workflow: WorkflowDefinition) => void;
  readonly onError?: (error: string) => void;
};

const DEFAULT_WORKFLOW: WorkflowDefinition = {
  id: crypto.randomUUID(),
  nodes: [{ id: 'start_auto', type: 'start', label: 'Start', config: {} }],
  edges: [],
};

const MAX_HISTORY = 50;

export function WorkflowBuilder({ workflow, onWorkflowChange, onError }: WorkflowBuilderProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [workflowState, setWorkflowState] = useState<WorkflowDefinition | undefined>(
    workflow ?? DEFAULT_WORKFLOW,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const reactFlowRef = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);
  const workflowRef = useRef(workflowState);
  workflowRef.current = workflowState;

  const historyRef = useRef<WorkflowDefinition[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  const initHistory = useCallback((wf: WorkflowDefinition) => {
    historyRef.current = [JSON.parse(JSON.stringify(wf))];
    historyIndexRef.current = 0;
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    if (workflowState && historyRef.current.length === 0) {
      initHistory(workflowState);
    }
  }, [workflowState, initHistory]);

  useEffect(() => {
    if (workflow !== undefined) {
      setWorkflowState(workflow);
    }
  }, [workflow]);

  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  const pushHistory = useCallback(
    (wf: WorkflowDefinition) => {
      const idx = historyIndexRef.current;
      historyRef.current = historyRef.current.slice(0, idx + 1);
      historyRef.current.push(JSON.parse(JSON.stringify(wf)));
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      }
      historyIndexRef.current = historyRef.current.length - 1;
      updateUndoRedoState();
    },
    [updateUndoRedoState],
  );

  const handleChange = useCallback(
    (wf: WorkflowDefinition) => {
      setWorkflowState(wf);
      onWorkflowChange?.(wf);
      if (!isUndoRedoRef.current) {
        pushHistory(wf);
      }
    },
    [onWorkflowChange, pushHistory],
  );

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current--;
    const state = JSON.parse(
      JSON.stringify(historyRef.current[historyIndexRef.current]),
    ) as WorkflowDefinition;
    setWorkflowState(state);
    onWorkflowChange?.(state);
    updateUndoRedoState();
    queueMicrotask(() => {
      isUndoRedoRef.current = false;
    });
  }, [onWorkflowChange, updateUndoRedoState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    isUndoRedoRef.current = true;
    historyIndexRef.current++;
    const state = JSON.parse(
      JSON.stringify(historyRef.current[historyIndexRef.current]),
    ) as WorkflowDefinition;
    setWorkflowState(state);
    onWorkflowChange?.(state);
    updateUndoRedoState();
    queueMicrotask(() => {
      isUndoRedoRef.current = false;
    });
  }, [onWorkflowChange, updateUndoRedoState]);

  const handleAddNode = useCallback(
    (type: NodeType, position?: { x: number; y: number }) => {
      if (type === 'start') return;

      const existing = workflowRef.current ?? { id: crypto.randomUUID(), nodes: [], edges: [] };
      const hasStart = existing.nodes.some((n) => n.type === 'start');

      const id = crypto.randomUUID();
      const newNode: WorkflowNode = {
        id,
        type,
        label: type.charAt(0).toUpperCase() + type.slice(1),
        config: {},
        ...(position ? { position: { x: position.x, y: position.y } } : {}),
      };
      const updated = {
        ...existing,
        nodes: hasStart
          ? [...existing.nodes, newNode]
          : [{ id: 'start_auto', type: 'start', label: 'Start', config: {} }, newNode],
      };

      handleChange(updated as WorkflowDefinition);
    },
    [handleChange],
  );

  const handleUpdateNode = useCallback(
    (id: string, updates: { label?: string; config?: Record<string, unknown> }) => {
      const wf = workflowRef.current;
      if (!wf) return;
      const updated = {
        ...wf,
        nodes: wf.nodes.map((n) =>
          n.id === id ? { ...n, ...updates, config: updates.config ?? n.config } : n,
        ),
      };
      handleChange(updated);
    },
    [handleChange],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      const wf = workflowRef.current;
      if (!wf) return;
      const updated = {
        ...wf,
        nodes: wf.nodes.filter((n) => n.id !== id),
        edges: wf.edges.filter((e) => e.source !== id && e.target !== id),
      };
      setSelectedNodeId(null);
      handleChange(updated);
    },
    [handleChange],
  );

  const selectedNode = workflowState
    ? (() => {
        const n = workflowState.nodes.find((n) => n.id === selectedNodeId);
        return n
          ? { id: n.id, label: n.label ?? n.type, type: n.type, config: n.config ?? {} }
          : null;
      })()
    : null;

  const handleExport = useCallback(() => {
    const wf = workflowRef.current;
    if (!wf) return;
    const blob = new Blob([JSON.stringify(wf, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${wf.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSettingsChange = useCallback(
    (settings: GlobalSettings) => {
      const wf = workflowRef.current;
      if (!wf) return;
      handleChange({ ...wf, settings });
    },
    [handleChange],
  );

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const wf = JSON.parse(text) as WorkflowDefinition;
        handleChange(wf);
      } catch {
        onError?.('Invalid workflow JSON');
      }
    };
    input.click();
  }, [handleChange]);

  return (
    <div className="flex flex-col h-full">
      <Toolbar
        onToggleSettings={() => setShowSettings((v) => !v)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
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
            onInit={(instance) => {
              reactFlowRef.current = instance;
            }}
            onSelectNode={setSelectedNodeId}
            onAddNode={handleAddNode}
            onUndo={handleUndo}
            onRedo={handleRedo}
          />
        </div>
        {showSettings ? (
          <GlobalSettingsPanel
            settings={workflowState?.settings}
            onChange={handleSettingsChange}
            onClose={() => setShowSettings(false)}
          />
        ) : (
          <NodeConfigPanel
            node={selectedNode}
            onUpdate={handleUpdateNode}
            onDelete={handleDeleteNode}
            outputType={workflowState?.settings?.outputType}
            multiPage={workflowState?.settings?.multiPage}
            allNodes={workflowState?.nodes}
          />
        )}
      </div>
    </div>
  );
}
