import { useState } from "react";

export type SelectorOverlayProps = {
  readonly active?: boolean;
  readonly onSelectorPick?: (selector: string) => void;
};

export function SelectorOverlay({ active, onSelectorPick }: SelectorOverlayProps) {
  const [selector, setSelector] = useState("");

  const handlePick = () => {
    if (selector && onSelectorPick) {
      onSelectorPick(selector);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-gray-600">CSS Selector</label>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
          placeholder=".class, #id, div > p"
          value={selector}
          onChange={(e) => setSelector(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePick()}
        />
        <button
          onClick={handlePick}
          disabled={!active || !selector}
          className="px-2 py-1 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Apply
        </button>
      </div>
      {!active && (
        <p className="text-xs text-gray-400">Connect to a browser to use live selection</p>
      )}
    </div>
  );
}
