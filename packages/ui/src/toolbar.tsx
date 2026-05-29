export type ToolbarProps = {
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

import { Undo2, Redo2, Settings, Plus, Minus, Maximize2, Download, Upload } from "lucide-react";

export function Toolbar({ onUndo, onRedo, canUndo, canRedo, onZoomIn, onZoomOut, onFitView, onExport, onImport, onToggleSettings }: ToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
      <div className="flex items-center gap-1">
        {onUndo && (
          <button onClick={onUndo} disabled={!canUndo} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
        )}
        {onRedo && (
          <button onClick={onRedo} disabled={!canRedo} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={16} />
          </button>
        )}
        <div className="w-px h-4 bg-gray-200 mx-1" />
        {onToggleSettings && (
          <button onClick={onToggleSettings} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Global settings">
            <Settings size={16} />
          </button>
        )}
        {onZoomIn && (
          <button onClick={onZoomIn} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Zoom in">
            <Plus size={16} />
          </button>
        )}
        {onZoomOut && (
          <button onClick={onZoomOut} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Zoom out">
            <Minus size={16} />
          </button>
        )}
        {onFitView && (
          <button onClick={onFitView} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Fit to screen">
            <Maximize2 size={16} />
          </button>
        )}
        {onExport && (
          <button onClick={onExport} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Export JSON">
            <Download size={16} />
          </button>
        )}
        {onImport && (
          <button onClick={onImport} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Import JSON">
            <Upload size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
