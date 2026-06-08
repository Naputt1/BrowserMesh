import { X } from 'lucide-react';
import type { GlobalSettings, TimingControls, DataType } from '@browsermesh/sdk';

export type GlobalSettingsPanelProps = {
  settings?: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
  onClose: () => void;
};

const DEFAULT_OUTPUT: DataType = { kind: 'object', name: 'Output', fields: [] };

export function GlobalSettingsPanel({ settings, onChange, onClose }: GlobalSettingsPanelProps) {
  const timing = settings?.timing ?? {};
  const outputType = settings?.outputType ?? DEFAULT_OUTPUT;

  const updateTiming = (update: Partial<TimingControls>) => {
    onChange({ ...settings, timing: { ...timing, ...update } });
  };

  const updateOutputType = (update: DataType) => {
    onChange({ ...settings, outputType: update });
  };

  return (
    <div className="w-80 border-l bg-white p-4 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Global Settings</h3>
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">
          Close
        </button>
      </div>

      <div className="space-y-4">
        <Section title="Timing">
          <Field label="Min Delay (ms)">
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.minDelayMs ?? ''}
              onChange={(e) =>
                updateTiming({
                  minDelayMs: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            />
          </Field>
          <Field label="Max Delay (ms)">
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.maxDelayMs ?? ''}
              onChange={(e) =>
                updateTiming({
                  maxDelayMs: e.target.value ? parseInt(e.target.value, 10) : undefined,
                })
              }
            />
          </Field>
          <Field label="Typing Speed">
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.typingSpeed ?? 'instant'}
              onChange={(e) =>
                updateTiming({ typingSpeed: e.target.value as TimingControls['typingSpeed'] })
              }
            >
              <option value="instant">Instant</option>
              <option value="fast">Fast</option>
              <option value="human">Human</option>
              <option value="slow">Slow</option>
            </select>
          </Field>
          <Field label="Options">
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                className="rounded"
                checked={timing.requestJitter ?? false}
                onChange={(e) => updateTiming({ requestJitter: e.target.checked })}
              />
              <span className="text-xs text-gray-600">Request jitter</span>
            </label>
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                className="rounded"
                checked={timing.scrollSimulation ?? false}
                onChange={(e) => updateTiming({ scrollSimulation: e.target.checked })}
              />
              <span className="text-xs text-gray-600">Scroll simulation</span>
            </label>
            <label className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                className="rounded"
                checked={timing.randomMouseMovement ?? false}
                onChange={(e) => updateTiming({ randomMouseMovement: e.target.checked })}
              />
              <span className="text-xs text-gray-600">Random mouse movement</span>
            </label>
          </Field>
        </Section>

        <Section title="Pages">
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              className="rounded"
              checked={settings?.multiPage ?? false}
              onChange={(e) => onChange({ ...settings, multiPage: e.target.checked })}
            />
            <span className="text-xs text-gray-600">Enable multi-page mode</span>
          </label>
          <p className="text-[10px] text-gray-400 mt-1">
            Allows spawning and switching between multiple tabs
          </p>
        </Section>

        <Section title="State Persistence">
          <label className="flex items-center gap-2 mt-1">
            <input
              type="checkbox"
              className="rounded"
              checked={settings?.statePersistence !== false}
              onChange={(e) => onChange({ ...settings, statePersistence: e.target.checked })}
            />
            <span className="text-xs text-gray-600">Enable state persistence</span>
          </label>
          <p className="text-[10px] text-gray-400 mt-1">
            Saves global state to disk for crash recovery
          </p>
        </Section>

        <Section title="Output Type">
          <TypeBuilder type={outputType} onChange={updateOutputType} root />
        </Section>
      </div>
    </div>
  );
}

function TypeBuilder({
  type,
  onChange,
  root,
}: {
  type: DataType;
  onChange: (t: DataType) => void;
  root?: boolean;
}) {
  return (
    <div className={root ? '' : 'ml-3 pl-3 border-l border-gray-200'}>
      {root && (
        <Field label="Root Type Name">
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
            placeholder="Output"
            value={type.name ?? ''}
            onChange={(e) => onChange({ ...type, name: e.target.value || undefined })}
          />
        </Field>
      )}

      <Field label="Kind">
        <select
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={type.kind}
          onChange={(e) => {
            const kind = e.target.value as DataType['kind'];
            const base: DataType =
              kind === 'object'
                ? { kind, fields: [] }
                : kind === 'array'
                  ? { kind, elementType: { kind: 'string' } }
                  : { kind };
            onChange(base);
          }}
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="object">object</option>
          <option value="array">array</option>
        </select>
      </Field>

      {type.kind === 'object' && (
        <div className="mt-2">
          <label className="text-xs font-medium text-gray-600">Fields</label>
          <div className="mt-1 space-y-2">
            {(type.fields ?? []).map((field, i) => (
              <div key={i} className="bg-gray-50 rounded border p-2">
                <div className="flex items-center gap-1 mb-1">
                  <input
                    className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
                    placeholder="name"
                    value={field.name}
                    onChange={(e) => {
                      const fields = [...(type.fields ?? [])];
                      fields[i] = { ...field, name: e.target.value };
                      onChange({ ...type, fields });
                    }}
                  />
                  <button
                    onClick={() => {
                      const fields = (type.fields ?? []).filter((_, j) => j !== i);
                      onChange({ ...type, fields: fields.length ? fields : undefined });
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
                <TypeBuilder
                  type={field.type}
                  onChange={(t) => {
                    const fields = [...(type.fields ?? [])];
                    fields[i] = { ...field, type: t };
                    onChange({ ...type, fields });
                  }}
                />
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const fields = [
                ...(type.fields ?? []),
                { name: '', type: { kind: 'string' } as DataType },
              ];
              onChange({ ...type, fields });
            }}
            className="mt-2 text-xs text-blue-600 hover:text-blue-800"
          >
            + Add Field
          </button>
        </div>
      )}

      {type.kind === 'array' && (
        <div className="mt-2">
          <label className="text-xs font-medium text-gray-600">Element Type</label>
          <TypeBuilder
            type={type.elementType ?? { kind: 'string' }}
            onChange={(t) => onChange({ ...type, elementType: t })}
          />
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <label className="text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  );
}
