import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "./lib/cn";
import { getNodeColor, type RFNode } from "./lib/workflow-converter";

export function WorkflowNode({ data, selected }: NodeProps<RFNode>) {
  const color = getNodeColor(data.nodeType);
  const typeLabel = data.nodeType.charAt(0).toUpperCase() + data.nodeType.slice(1);

  return (
    <div
      className={cn(
        "px-4 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[160px]",
        selected ? "border-primary ring-2 ring-primary/20" : "border-gray-200",
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-400" />
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">{typeLabel}</div>
      <div className="text-sm font-semibold text-gray-900 mt-0.5">{data.label}</div>
      {data.nodeType === "extract" && data.config?.typeName != null && (
        <div className="text-xs text-gray-500 mt-1 font-mono">{String(data.config.typeName)}</div>
      )}
      {data.nodeType === "loop" && data.config?.maxIterations != null && (
        <div className="text-xs text-gray-500 mt-1">Max: {String(data.config.maxIterations)}</div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}
