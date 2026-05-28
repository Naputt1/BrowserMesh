import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeType, PinDescriptor } from "@browsermesh/workflow";
import { NODE_DEFINITIONS } from "@browsermesh/workflow";
import { cn } from "./lib/cn";
import { getNodeColor, getPinColor, type RFNode } from "./lib/workflow-converter";

function PinLabel({ pin, side, top }: { pin: PinDescriptor; side: "left" | "right"; top: number }) {
  return (
    <span
      className="absolute text-[9px] text-gray-400 pointer-events-none select-none whitespace-nowrap leading-none"
      style={{
        [side === "left" ? "left" : "right"]: "8px",
        top: `${top}px`,
      }}
    >
      {pin.label}
    </span>
  );
}

export function WorkflowNode({ data, selected }: NodeProps<RFNode>) {
  const def = NODE_DEFINITIONS[data.nodeType];
  const color = getNodeColor(data.nodeType);
  const typeLabel = data.nodeType.charAt(0).toUpperCase() + data.nodeType.slice(1);

  const flowInputs = def?.inputs.filter((p) => p.type === "flow") ?? [];
  const dataInputs = def?.inputs.filter((p) => p.type !== "flow") ?? [];
  const flowOutputs = def?.outputs.filter((p) => p.type === "flow") ?? [];
  const dataOutputs = def?.outputs.filter((p) => p.type !== "flow") ?? [];

  const flowTop = 16;
  const pinGap = 28;
  const dataStart = flowTop + Math.max(flowInputs.length, flowOutputs.length) * pinGap;

  return (
    <div
      className={cn(
        "relative px-12 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]",
        selected ? "border-primary ring-2 ring-primary/20" : "border-gray-200",
      )}
      style={{ borderLeftColor: color, borderLeftWidth: 4 }}
    >
      {/* --- INPUTS (left side) --- */}
      {flowInputs.map((pin, i) => {
        const top = flowTop + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="target"
              position={Position.Left}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type) }}
            />
            <PinLabel pin={pin} side="left" top={top - 4} />
          </span>
        );
      })}

      {dataInputs.map((pin, i) => {
        const top = dataStart + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="target"
              position={Position.Left}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type) }}
            />
            <PinLabel pin={pin} side="left" top={top - 4} />
          </span>
        );
      })}

      {/* --- CONTENT --- */}
      <div className="flex flex-col items-center gap-0.5">
        <div
          className="text-xs font-medium uppercase tracking-wider rounded px-1.5 py-0.5 text-white"
          style={{ backgroundColor: color }}
        >
          {typeLabel}
        </div>
        <div className="text-sm font-semibold text-gray-900 text-center">{data.label}</div>
        {def?.category && (
          <div className="text-[10px] text-gray-400">{def.category}</div>
        )}
      </div>

      {/* --- OUTPUTS (right side) --- */}
      {flowOutputs.map((pin, i) => {
        const top = flowTop + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="source"
              position={Position.Right}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type) }}
            />
            <PinLabel pin={pin} side="right" top={top - 4} />
          </span>
        );
      })}

      {dataOutputs.map((pin, i) => {
        const top = dataStart + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="source"
              position={Position.Right}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type) }}
            />
            <PinLabel pin={pin} side="right" top={top - 4} />
          </span>
        );
      })}

      {/* spacer so the node is tall enough for all pins */}
      <div style={{ height: `${dataStart + Math.max(dataInputs.length, dataOutputs.length) * pinGap - 8}px` }} />
    </div>
  );
}
