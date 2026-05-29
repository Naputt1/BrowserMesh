import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { NodeType, PinDescriptor, DataType } from '@browsermesh/workflow';
import { NODE_DEFINITIONS } from '@browsermesh/workflow';
import { cn } from './lib/cn';
import { getNodeColor, getPinColor, type RFNode } from './lib/workflow-converter';

const TYPE_BADGE: Record<string, string> = {
  string: 'str',
  number: 'num',
  boolean: 'bool',
  object: 'obj',
  array: 'arr',
};

function PinLabel({ pin, side, top }: { pin: PinDescriptor; side: 'left' | 'right'; top: number }) {
  const badge = pin.dataType?.kind ? TYPE_BADGE[pin.dataType.kind] : undefined;
  return (
    <span
      className="absolute text-[9px] text-gray-400 pointer-events-none select-none whitespace-nowrap leading-none flex items-center gap-1"
      style={{
        [side === 'left' ? 'left' : 'right']: '8px',
        top: `${top}px`,
      }}
    >
      {side === 'left' && badge && <TypeBadge kind={pin.dataType!.kind} />}
      {pin.label}
      {side === 'right' && badge && <TypeBadge kind={pin.dataType!.kind} />}
    </span>
  );
}

function TypeBadge({ kind }: { kind: DataType['kind'] }) {
  const colors: Record<string, string> = {
    string: 'bg-blue-100 text-blue-700',
    number: 'bg-green-100 text-green-700',
    boolean: 'bg-purple-100 text-purple-700',
    object: 'bg-amber-100 text-amber-700',
    array: 'bg-rose-100 text-rose-700',
  };
  return (
    <span
      className={`inline-block text-[8px] px-1 py-[1px] rounded font-medium leading-none ${colors[kind] ?? 'bg-gray-100 text-gray-500'}`}
    >
      {TYPE_BADGE[kind] ?? kind}
    </span>
  );
}

export function WorkflowNode({ data, selected }: NodeProps<RFNode>) {
  const def = NODE_DEFINITIONS[data.nodeType];
  const color = getNodeColor(data.nodeType);
  const typeLabel = data.nodeType.charAt(0).toUpperCase() + data.nodeType.slice(1);

  const showPageKey = data.multiPage === true;
  const pageKeyFilter = (p: { name: string }) => showPageKey || p.name !== 'pageKey';
  const flowInputs = def?.inputs.filter((p) => p.type === 'flow') ?? [];
  const dataInputs = def?.inputs.filter((p) => p.type !== 'flow' && pageKeyFilter(p)) ?? [];
  const flowOutputs = def?.outputs.filter((p) => p.type === 'flow') ?? [];
  const dataOutputs = def?.outputs.filter((p) => p.type !== 'flow' && pageKeyFilter(p)) ?? [];

  const switchCases =
    data.nodeType === 'switch'
      ? ((data.config?.cases as Array<{ label: string; value: string }>) ?? [])
      : [];
  const totalFlowOutputs = flowOutputs.length + switchCases.length;

  const flowTop = 16;
  const pinGap = 28;
  const leftDataStart = flowTop + flowInputs.length * pinGap;
  const rightDataStart = flowTop + totalFlowOutputs * pinGap;

  return (
    <div
      className={cn(
        'relative px-12 py-3 rounded-lg border-2 bg-white shadow-sm min-w-[180px]',
        selected ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200',
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
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type, pin.name) }}
            />
            <PinLabel pin={pin} side="left" top={top - 4} />
          </span>
        );
      })}

      {dataInputs.map((pin, i) => {
        const top = leftDataStart + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="target"
              position={Position.Left}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type, pin.name) }}
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
        {def?.category && <div className="text-[10px] text-gray-400">{def.category}</div>}
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
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type, pin.name) }}
            />
            <PinLabel pin={pin} side="right" top={top - 4} />
          </span>
        );
      })}

      {switchCases.map((c, i) => {
        const top = flowTop + (flowOutputs.length + i) * pinGap;
        return (
          <span key={`case_${i}`}>
            <Handle
              type="source"
              position={Position.Right}
              id={`case_${i}`}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor('flow', `case_${i}`) }}
            />
            <span
              className="absolute text-[9px] text-gray-400 pointer-events-none select-none whitespace-nowrap leading-none right-2"
              style={{ top: `${top - 4}px` }}
            >
              {c.label || `Case ${i + 1}`}
            </span>
          </span>
        );
      })}

      {dataOutputs.map((pin, i) => {
        const top = rightDataStart + i * pinGap;
        return (
          <span key={pin.name}>
            <Handle
              type="source"
              position={Position.Right}
              id={pin.name}
              className="!w-2 !h-2 !border-0"
              style={{ top: `${top}px`, backgroundColor: getPinColor(pin.type, pin.name) }}
            />
            <PinLabel pin={pin} side="right" top={top - 4} />
          </span>
        );
      })}

      {/* spacer so the node is tall enough for all pins */}
      <div
        style={{
          height: `${Math.max(leftDataStart + dataInputs.length * pinGap, rightDataStart + dataOutputs.length * pinGap) - 8}px`,
        }}
      />
    </div>
  );
}
