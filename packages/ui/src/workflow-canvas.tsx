import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowNode } from './custom-nodes';
import {
  workflowToReactFlow,
  reactFlowToWorkflow,
  getNodeColor,
  getNodeDef,
  isDataTypeAssignable,
  getPinDataType,
  getEdgeStyle,
} from './lib/workflow-converter';
import type { WorkflowDefinition, NodeType } from '@browsermesh/workflow';
import { NODE_DEFINITIONS, CATEGORIES } from '@browsermesh/workflow';
import type { RFNode, RFEdge } from './lib/workflow-converter';
import { ContextMenu } from './components/ui/context-menu';

const nodeTypes = { workflowNode: WorkflowNode };

export type WorkflowCanvasProps = {
  workflow?: WorkflowDefinition;
  onChange?: (workflow: WorkflowDefinition) => void;
  readonly?: boolean;
  onInit?: (instance: ReactFlowInstance<RFNode, RFEdge>) => void;
  onSelectNode?: (nodeId: string | null) => void;
  onAddNode?: (type: NodeType, position?: { x: number; y: number }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  highlightedNodeId?: string | null;
};

export function WorkflowCanvas({
  workflow,
  onChange,
  readonly,
  onInit,
  onSelectNode,
  onAddNode,
  onUndo,
  onRedo,
  highlightedNodeId,
}: WorkflowCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const instanceRef = useRef<ReactFlowInstance<RFNode, RFEdge> | null>(null);
  const clipboardRef = useRef<{ nodes: RFNode[]; edges: RFEdge[] } | null>(null);
  const deleteGuardRef = useRef(false);

  type CtxMenuState = {
    show: boolean;
    x: number;
    y: number;
    kind: 'node' | 'pane';
    nodeId?: string;
  };
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>({ show: false, x: 0, y: 0, kind: 'pane' });

  const closeCtxMenu = useCallback(() => setCtxMenu((p) => ({ ...p, show: false })), []);

  const handleInit = useCallback(
    (instance: ReactFlowInstance<RFNode, RFEdge>) => {
      instanceRef.current = instance;
      onInit?.(instance);
    },
    [onInit],
  );

  useEffect(() => {
    if (!workflow) return;
    const converted = workflowToReactFlow(workflow, nodesRef.current);
    setNodes(converted.nodes);
    setEdges(converted.edges);
  }, [workflow]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, highlighted: n.id === highlightedNodeId },
      })),
    );
  }, [highlightedNodeId]);

  const emitChange = useCallback(
    (newNodes: RFNode[], newEdges: RFEdge[]) => {
      if (!onChange) return;
      const wf = reactFlowToWorkflow(
        newNodes,
        newEdges,
        workflow?.id,
        workflow?.name,
        workflow?.settings,
      );
      onChange(wf);
    },
    [onChange, workflow],
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: RFNode) => {
      if (!event.shiftKey) {
        onSelectNode?.(node.id);
      }
    },
    [onSelectNode],
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      if (!event.shiftKey) {
        onSelectNode?.(null);
      }
    },
    [onSelectNode],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readonly) return;

      const sourceHandle = connection.sourceHandle ?? undefined;
      const targetHandle = connection.targetHandle ?? undefined;
      if (!sourceHandle || !targetHandle) return;

      const currentEdges = instanceRef.current?.getEdges() ?? edgesRef.current;
      const currentNodes = instanceRef.current?.getNodes() ?? nodesRef.current;
      let newEdges = [...currentEdges];

      const isFlow = sourceHandle === 'flow' || targetHandle === 'flow';
      if (isFlow) {
        newEdges = newEdges.filter(
          (e) =>
            !(e.source === connection.source && e.sourceHandle === sourceHandle) &&
            !(e.target === connection.target && e.targetHandle === targetHandle),
        );
      } else {
        newEdges = newEdges.filter(
          (e) => !(e.target === connection.target && e.targetHandle === targetHandle),
        );
      }

      newEdges = addEdge(
        {
          ...connection,
          type: 'smoothstep',
          style: getEdgeStyle(targetHandle),
        },
        newEdges,
      );
      setEdges(newEdges);
      emitChange(currentNodes, newEdges);
    },
    [readonly, setEdges, emitChange],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: RFEdge) => {
      event.preventDefault();
      if (readonly) return;
      if (!instanceRef.current) return;
      const currentNodes = instanceRef.current.getNodes();
      const currentEdges = instanceRef.current.getEdges();
      const newEdges = currentEdges.filter((e) => e.id !== edge.id);
      setEdges(newEdges);
      emitChange(currentNodes, newEdges);
    },
    [readonly, setEdges, emitChange],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode) => {
      event.preventDefault();
      if (readonly) return;
      setCtxMenu({ show: true, x: event.clientX, y: event.clientY, kind: 'node', nodeId: node.id });
    },
    [readonly],
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      if (readonly) return;
      setCtxMenu({
        show: true,
        x: (event as MouseEvent).clientX,
        y: (event as MouseEvent).clientY,
        kind: 'pane',
      });
    },
    [readonly],
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: RFNode) => {
      if (readonly || !instanceRef.current) return;
      emitChange(instanceRef.current.getNodes(), instanceRef.current.getEdges());
    },
    [readonly, emitChange],
  );

  const handleDuplicateNode = useCallback(
    (nodeId: string) => {
      if (!instanceRef.current) return;
      const node = instanceRef.current.getNodes().find((n) => n.id === nodeId);
      if (!node) return;
      const newId = `node_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newNode: RFNode = {
        ...node,
        id: newId,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        selected: true,
      };
      const curNodes = instanceRef.current.getNodes();
      const curEdges = instanceRef.current.getEdges();
      const updatedNodes = [...curNodes, newNode];
      setNodes(updatedNodes);
      emitChange(updatedNodes, curEdges);
    },
    [setNodes, emitChange],
  );

  const handleDeleteNodeFromCtx = useCallback(
    (nodeId: string) => {
      if (!instanceRef.current) return;
      const curNodes = instanceRef.current.getNodes();
      const curEdges = instanceRef.current.getEdges();
      const updatedNodes = curNodes.filter((n) => n.id !== nodeId);
      const updatedEdges = curEdges.filter((e) => e.source !== nodeId && e.target !== nodeId);
      onSelectNode?.(null);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      emitChange(updatedNodes, updatedEdges);
    },
    [onSelectNode, setNodes, setEdges, emitChange],
  );

  const handleCopyNodeToClipboard = useCallback((nodeId: string) => {
    if (!instanceRef.current) return;
    const allNodes = instanceRef.current.getNodes();
    const allEdges = instanceRef.current.getEdges();
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return;
    const selectedNodes = [node];
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = allEdges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    clipboardRef.current = { nodes: selectedNodes, edges: selectedEdges };
  }, []);

  const onNodesDelete = useCallback(
    (_deleted: RFNode[]) => {
      if (deleteGuardRef.current) return;
      deleteGuardRef.current = true;
      queueMicrotask(() => {
        deleteGuardRef.current = false;
      });
      if (readonly || !instanceRef.current) return;
      emitChange(instanceRef.current.getNodes(), instanceRef.current.getEdges());
    },
    [readonly, emitChange],
  );

  const onEdgesDelete = useCallback(
    (_deleted: RFEdge[]) => {
      if (deleteGuardRef.current) return;
      deleteGuardRef.current = true;
      queueMicrotask(() => {
        deleteGuardRef.current = false;
      });
      if (readonly || !instanceRef.current) return;
      emitChange(instanceRef.current.getNodes(), instanceRef.current.getEdges());
    },
    [readonly, emitChange],
  );

  const isValidConnection = useCallback((connection: RFEdge | Connection) => {
    const sourceHandle = connection.sourceHandle ?? undefined;
    const targetHandle = connection.targetHandle ?? undefined;
    if (!sourceHandle || !targetHandle) return false;

    const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
    const targetNode = nodesRef.current.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return false;

    const sourceDef = getNodeDef(sourceNode.data.nodeType);
    const targetDef = getNodeDef(targetNode.data.nodeType);
    if (!sourceDef || !targetDef) return false;

    const sourcePin = sourceDef.outputs.find((p) => p.name === sourceHandle);
    const targetPin = targetDef.inputs.find((p) => p.name === targetHandle);
    if (!sourcePin || !targetPin) return false;

    if (sourcePin.type !== targetPin.type) return false;

    if (sourcePin.type === 'data') {
      const sourceType = getPinDataType(sourceNode, sourcePin, sourceHandle);
      const targetType = getPinDataType(targetNode, targetPin, targetHandle);
      if (!isDataTypeAssignable(sourceType, targetType)) return false;
    }

    return true;
  }, []);

  const handleCopy = useCallback(() => {
    if (!instanceRef.current) return;
    const allNodes = instanceRef.current.getNodes();
    const allEdges = instanceRef.current.getEdges();
    const selectedNodes = allNodes.filter((n) => n.selected);
    if (selectedNodes.length === 0) return;
    const selectedNodeIds = new Set(selectedNodes.map((n) => n.id));
    const selectedEdges = allEdges.filter(
      (e) => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target),
    );
    clipboardRef.current = { nodes: selectedNodes, edges: selectedEdges };
  }, []);

  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || !instanceRef.current) return;
    const { nodes: copiedNodes, edges: copiedEdges } = clipboardRef.current;

    const idMap = new Map<string, string>();
    const newNodes: RFNode[] = copiedNodes.map((n) => {
      const newId = crypto.randomUUID();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 60, y: n.position.y + 60 },
        selected: true,
      };
    });

    const newEdges: RFEdge[] = copiedEdges.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
      selected: true,
    }));

    const curNodes = instanceRef.current.getNodes();
    const curEdges = instanceRef.current.getEdges();
    const updatedNodes = [...curNodes.map((n) => ({ ...n, selected: false })), ...newNodes];
    const updatedEdges = [...curEdges, ...newEdges];

    setNodes(updatedNodes);
    setEdges(updatedEdges);
    emitChange(updatedNodes, updatedEdges);
  }, [setNodes, setEdges, emitChange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: KeyboardEvent) => {
      if (e.target !== el && !el.contains(e.target as Node)) return;
      const isCmd = e.metaKey || e.ctrlKey;

      if (isCmd && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo?.();
        return;
      }
      if ((isCmd && e.key === 'z' && !e.shiftKey) || (isCmd && e.key === 'y')) {
        e.preventDefault();
        onUndo?.();
        return;
      }
      if (isCmd && e.key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }
      if (isCmd && e.key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }
    };

    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [onUndo, onRedo, handleCopy, handlePaste]);

  return (
    <div ref={containerRef} tabIndex={0} className="h-full w-full outline-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readonly ? undefined : onNodesChange}
        onEdgesChange={readonly ? undefined : onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={onPaneContextMenu}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        panOnDrag={[1]}
        selectionOnDrag
        fitView
        minZoom={0.3}
        maxZoom={2}
        snapToGrid
        snapGrid={[20, 20]}
        deleteKeyCode={readonly ? undefined : 'Delete'}
        className="bg-gray-50"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MiniMap
          nodeColor={(node: RFNode) => getNodeColor(node.data.nodeType)}
          nodeStrokeColor={(node: RFNode) => getNodeColor(node.data.nodeType)}
          nodeBorderRadius={4}
          maskColor="rgba(0,0,0,0.1)"
          className="border rounded-md shadow-sm"
        />
      </ReactFlow>

      {ctxMenu.show && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onClose={closeCtxMenu}
          items={
            ctxMenu.kind === 'node' && ctxMenu.nodeId
              ? [
                  { label: 'Edit', onClick: () => onSelectNode?.(ctxMenu.nodeId ?? null) },
                  { label: 'Copy', onClick: () => handleCopyNodeToClipboard(ctxMenu.nodeId!) },
                  { label: 'Duplicate', onClick: () => handleDuplicateNode(ctxMenu.nodeId!) },
                  { separator: true },
                  {
                    label: 'Delete',
                    onClick: () => handleDeleteNodeFromCtx(ctxMenu.nodeId!),
                    danger: true,
                  },
                ]
              : [
                  {
                    label: 'New',
                    children: CATEGORIES.map((cat) => ({
                      label: cat.label,
                      children: Object.values(NODE_DEFINITIONS)
                        .filter(
                          (def) =>
                            def.category === cat.value &&
                            def.type !== 'page' &&
                            def.type !== 'start',
                        )
                        .map((def) => ({
                          label: def.label,
                          color: def.color,
                          onClick: () => {
                            const pos = instanceRef.current?.screenToFlowPosition({
                              x: ctxMenu.x,
                              y: ctxMenu.y,
                            });
                            onAddNode?.(def.type, pos);
                          },
                        })),
                    })),
                  },
                  { separator: true },
                  { label: 'Paste', onClick: handlePaste, disabled: !clipboardRef.current },
                ]
          }
        />
      )}
    </div>
  );
}
