import { X } from "lucide-react";
import { useState } from "react";

export type ExtractionMapperProps = {
  readonly typeName: string;
  readonly scopeId?: string;
};

export function ExtractionMapper({ typeName, scopeId }: ExtractionMapperProps) {
  const [fields, setFields] = useState<Array<{ name: string; selector: string; attr: string }>>([]);

  const addField = () => {
    setFields([...fields, { name: "", selector: "", attr: "text" }]);
  };

  const updateField = (index: number, updates: Partial<(typeof fields)[number]>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-gray-600">Type: </span>
          <span className="text-sm font-mono text-gray-800">{typeName}</span>
          {scopeId && <span className="text-xs text-gray-400 ml-2">({scopeId})</span>}
        </div>
        <button
          onClick={addField}
          className="px-2 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors"
        >
          + Field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 italic">No fields defined. Add a field to start mapping.</p>
      )}

      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded border">
            <div className="flex-1 space-y-1">
              <input
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                placeholder="Field name"
                value={field.name}
                onChange={(e) => updateField(i, { name: e.target.value })}
              />
              <input
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none font-mono"
                placeholder="CSS selector"
                value={field.selector}
                onChange={(e) => updateField(i, { selector: e.target.value })}
              />
              <select
                className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                value={field.attr}
                onChange={(e) => updateField(i, { attr: e.target.value })}
              >
                <option value="text">Text content</option>
                <option value="href">href</option>
                <option value="src">src</option>
                <option value="alt">alt</option>
                <option value="title">title</option>
                <option value="data-*">data-*</option>
              </select>
            </div>
            <button
              onClick={() => removeField(i)}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
