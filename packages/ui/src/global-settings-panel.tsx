import type { GlobalSettings, TimingControls, ExtractionSchema, ExtractionField } from "@browsermesh/workflow";

export type GlobalSettingsPanelProps = {
  settings?: GlobalSettings;
  onChange: (settings: GlobalSettings) => void;
  onClose: () => void;
};

export function GlobalSettingsPanel({ settings, onChange, onClose }: GlobalSettingsPanelProps) {
  const timing = settings?.timing ?? {};
  const outputType = settings?.outputType;

  const updateTiming = (update: Partial<TimingControls>) => {
    onChange({ ...settings, timing: { ...timing, ...update } });
  };

  const updateOutputType = (update: ExtractionSchema) => {
    onChange({ ...settings, outputType: update });
  };

  return (
    <div className="w-80 border-l bg-white p-4 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Global Settings</h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Close
        </button>
      </div>

      <div className="space-y-4">
        <Section title="Timing">
          <Field label="Min Delay (ms)">
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.minDelayMs ?? ""}
              onChange={(e) => updateTiming({ minDelayMs: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </Field>
          <Field label="Max Delay (ms)">
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.maxDelayMs ?? ""}
              onChange={(e) => updateTiming({ maxDelayMs: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            />
          </Field>
          <Field label="Typing Speed">
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={timing.typingSpeed ?? "instant"}
              onChange={(e) => updateTiming({ typingSpeed: e.target.value as TimingControls["typingSpeed"] })}
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

        <Section title="Output Type">
          <Field label="Root Type Name">
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
              placeholder="ScrapeResult"
              value={outputType?.rootTypeName ?? ""}
              onChange={(e) =>
                updateOutputType({
                  rootTypeName: e.target.value,
                  fields: outputType?.fields ?? [],
                })
              }
            />
          </Field>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Fields</label>
            {outputType?.fields && outputType.fields.length > 0 ? (
              <div className="mt-1 space-y-2">
                {outputType.fields.map((field, i) => (
                  <OutputFieldRow
                    key={i}
                    field={field}
                    onChange={(updated) => {
                      const fields = [...outputType.fields];
                      fields[i] = updated;
                      updateOutputType({ ...outputType, fields });
                    }}
                    onDelete={() => {
                      const fields = outputType.fields.filter((_, j) => j !== i);
                      updateOutputType({ ...outputType, fields });
                    }}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">No fields defined</p>
            )}
            <button
              onClick={() => {
                const fields = [...(outputType?.fields ?? []), { name: "", valueType: "string" as const }];
                updateOutputType({ rootTypeName: outputType?.rootTypeName ?? "", fields });
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
            >
              + Add Field
            </button>
          </div>
        </Section>
      </div>
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

function OutputFieldRow({
  field,
  onChange,
  onDelete,
}: {
  field: ExtractionField;
  onChange: (f: ExtractionField) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
        placeholder="name"
        value={field.name}
        onChange={(e) => onChange({ ...field, name: e.target.value })}
      />
      <select
        className="rounded border border-gray-300 px-1 py-1 text-xs"
        value={field.valueType}
        onChange={(e) => onChange({ ...field, valueType: e.target.value as ExtractionField["valueType"] })}
      >
        <option value="string">str</option>
        <option value="number">num</option>
        <option value="boolean">bool</option>
        <option value="object">obj</option>
        <option value="array">arr</option>
      </select>
      <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700 px-1">
        ✕
      </button>
    </div>
  );
}
