# @browsermesh/ui

Embeddable React components for visual workflow authoring. Built with React 19, Tailwind CSS, Radix UI, and React Flow.

## Installation

```sh
pnpm add @browsermesh/ui
```

## Components

### WorkflowBuilder

Top-level component that composes the full authoring experience:

```typescript
type WorkflowBuilderProps = {
  workflows: WorkflowDefinition[];
  onCompile?: (ir: WorkflowIR) => void;
  onSave?: (workflows: WorkflowDefinition[]) => void;
  runtimeEndpoint?: string;
};
```

### WorkflowCanvas

React Flow-based graph editor:

```typescript
type WorkflowCanvasProps = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange?: (nodes: WorkflowNode[]) => void;
  onEdgesChange?: (edges: WorkflowEdge[]) => void;
  onAddNode?: (type: NodeType, position: { x: number; y: number }) => void;
  selectedNodeId?: string;
  onSelectNode?: (nodeId: string) => void;
};
```

### BrowserPane

Embedded browser preview using an iframe or WebSocket stream:

```typescript
type BrowserPaneProps = {
  url?: string;
  screenshot?: Uint8Array;
  onNavigate?: (url: string) => void;
  showControls?: boolean;
};
```

### SelectorOverlay

DOM element selector picker that overlays the browser preview:

```typescript
type SelectorOverlayProps = {
  enabled: boolean;
  onSelect?: (selector: string) => void;
  rootElement?: string;
};
```

### ExtractionMapper

Visual extraction mapping interface:

```typescript
type ExtractionMapperProps = {
  scopes: ExtractionScope[];
  onMap?: (scope: ExtractionScope) => void;
  previewData?: Record<string, unknown>;
};
```

### DevtoolsPanel

Integrated DevTools-style panels:

```typescript
type DevtoolsPanelProps = {
  tabs?: Array<'console' | 'network' | 'dom'>;
  logs?: LogEvent[];
  requests?: NetworkRequest[];
  domSnapshot?: string;
};
```

### TaskConsole

Streaming task event viewer:

```typescript
type TaskConsoleProps = {
  events: WorkflowEvent[];
  onClear?: () => void;
};
```

### Toolbar

Workflow action toolbar:

```typescript
type ToolbarProps = {
  onUndo?: () => void;
  onRedo?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRun?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};
```

### NodeConfigPanel

Configuration panel for the selected node:

```typescript
type NodeConfigPanelProps = {
  node?: WorkflowNode;
  onChange?: (node: WorkflowNode) => void;
};
```

### GlobalSettingsPanel

Workflow-level settings:

```typescript
type GlobalSettingsPanelProps = {
  settings?: GlobalSettings;
  onChange?: (settings: GlobalSettings) => void;
};
```

### ScreenshotViewer

View screenshots captured during execution:

```typescript
type ScreenshotViewerProps = {
  screenshots?: Array<{ label: string; data: Uint8Array; mimeType: string }>;
};
```
