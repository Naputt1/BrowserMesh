import type { NodeType } from "@browsermesh/workflow";
import { NODE_DEFINITIONS, CATEGORIES } from "@browsermesh/workflow";

export type ToolbarProps = {
  onAddNode: (type: NodeType) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onToggleSettings?: () => void;
};

export function Toolbar({ onAddNode, onUndo, onRedo, canUndo, canRedo, onZoomIn, onZoomOut, onFitView, onExport, onImport, onToggleSettings }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
      {CATEGORIES.map((cat) => (
        <div key={cat.value} className="flex items-center gap-1">
          <span className="text-[10px] font-medium text-gray-400 uppercase mr-1">{cat.label}</span>
          {Object.values(NODE_DEFINITIONS)
            .filter((def) => def.category === cat.value)
            .map((def) => (
              <button
                key={def.type}
                onClick={() => onAddNode(def.type)}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-gray-100 text-gray-700 transition-colors"
                title={`Add ${def.label} node`}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: def.color }}
                />
                {def.label}
              </button>
            ))}
          <div className="w-px h-4 bg-gray-200 mx-1 last:hidden" />
        </div>
      ))}
      <div className="ml-auto flex items-center gap-1">
        {onUndo && (
          <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
            ↩
          </button>
        )}
        {onRedo && (
          <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Shift+Z)">
            ↪
          </button>
        )}
        <div className="w-px h-4 bg-gray-200 mx-1" />
        {onToggleSettings && (
          <button onClick={onToggleSettings} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Global settings">
            ⚙
          </button>
        )}
        {onZoomIn && (
          <button onClick={onZoomIn} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Zoom in">
            +
          </button>
        )}
        {onZoomOut && (
          <button onClick={onZoomOut} className="p-1.5 rounded hover:bg-gray-100 text-xs text-gray-600" title="Zoom out">
            −
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
