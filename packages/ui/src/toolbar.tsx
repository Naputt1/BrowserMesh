const nodeTypes = [
  { type: "navigate" as const, label: "Navigate" },
  { type: "click" as const, label: "Click" },
  { type: "type" as const, label: "Type" },
  { type: "wait" as const, label: "Wait" },
  { type: "scroll" as const, label: "Scroll" },
  { type: "extract" as const, label: "Extract" },
  { type: "loop" as const, label: "Loop" },
  { type: "custom" as const, label: "Custom" },
];

export type ToolbarProps = {
  onAddNode: (type: string) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onExport?: () => void;
  onImport?: () => void;
};

export function Toolbar({ onAddNode, onZoomIn, onZoomOut, onFitView, onExport, onImport }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-1">
        {nodeTypes.map((nt) => (
          <button
            key={nt.type}
            onClick={() => onAddNode(nt.type)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 text-gray-700 transition-colors"
            title={`Add ${nt.label} node`}
          >
            <span className="text-gray-400">+</span>
            {nt.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        {onZoomIn && (
          <button onClick={onZoomIn} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Zoom in">
            🔍+
          </button>
        )}
        {onZoomOut && (
          <button onClick={onZoomOut} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Zoom out">
            🔍−
          </button>
        )}
        {onFitView && (
          <button onClick={onFitView} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Fit to screen">
            ⊞
          </button>
        )}
        {onExport && (
          <button onClick={onExport} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Export JSON">
            ⬇
          </button>
        )}
        {onImport && (
          <button onClick={onImport} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Import JSON">
            ⬆
          </button>
        )}
      </div>
    </div>
  );
}
