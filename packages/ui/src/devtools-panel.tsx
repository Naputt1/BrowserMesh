import { useState } from 'react';
import type { WorkflowEvent } from '@browsermesh/sdk';

export type DevtoolsPanelProps = {
  readonly logs?: readonly WorkflowEvent[];
};

type Tab = 'console' | 'network';

export function DevtoolsPanel({ logs }: DevtoolsPanelProps) {
  const [tab, setTab] = useState<Tab>('console');

  const logEvents =
    logs?.filter((e): e is WorkflowEvent & { type: 'log' } => e.type === 'log') ?? [];

  return (
    <div className="bg-gray-900 text-gray-100 rounded-lg border overflow-hidden flex flex-col h-full">
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setTab('console')}
          className={`px-3 py-1.5 text-xs font-medium ${tab === 'console' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Console
        </button>
        <button
          onClick={() => setTab('network')}
          className={`px-3 py-1.5 text-xs font-medium ${tab === 'network' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-gray-200'}`}
        >
          Network
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 font-mono text-xs space-y-1">
        {tab === 'console' &&
          (logEvents.length === 0 ? (
            <div className="text-gray-500 italic">No log entries</div>
          ) : (
            logEvents.map((e, i) => (
              <div
                key={i}
                className={`${e.level === 'error' ? 'text-red-400' : e.level === 'warn' ? 'text-yellow-400' : e.level === 'info' ? 'text-blue-400' : 'text-gray-300'}`}
              >
                <span className="opacity-50">[{e.level}]</span> {e.message}
              </div>
            ))
          ))}

        {tab === 'network' && <div className="text-gray-500 italic">Network log coming soon</div>}
      </div>
    </div>
  );
}
