import { useState } from "react";
import type { NodeType } from "@browsermesh/workflow";
import { NODE_DEFINITIONS } from "@browsermesh/workflow";

export type NodeConfigPanelProps = {
  node: { id: string; label: string; type: NodeType; config: Record<string, unknown> } | null;
  onUpdate: (id: string, updates: { label?: string; config?: Record<string, unknown> }) => void;
  onDelete: (id: string) => void;
};

export function NodeConfigPanel({ node, onUpdate, onDelete }: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="w-64 border-l bg-gray-50 p-4 shrink-0">
        <p className="text-sm text-gray-500">Select a node to edit</p>
      </div>
    );
  }

  const def = NODE_DEFINITIONS[node.type];

  return (
    <div className="w-72 border-l bg-white p-4 shrink-0 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Node Configuration</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Label</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            value={node.label}
            onChange={(e) => onUpdate(node.id, { label: e.target.value })}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Type</label>
          <div className="mt-1 text-sm text-gray-800 font-mono">{node.type}</div>
        </div>

        {def?.category && (
          <div>
            <label className="text-xs font-medium text-gray-600">Category</label>
            <div className="mt-1 text-sm text-gray-500">{def.category}</div>
          </div>
        )}

        <Separator />

        <ConfigFields type={node.type} config={node.config} onUpdate={(cfg) => onUpdate(node.id, { config: cfg })} />

        <Separator />

        <button
          onClick={() => onDelete(node.id)}
          className="w-full px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}

function Separator() {
  return <div className="border-t my-2" />;
}

type ConfigFieldsProps = {
  type: NodeType;
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

function ConfigFields({ type, config, onUpdate }: ConfigFieldsProps) {
  switch (type) {
    case "start":
    case "end":
      return <p className="text-xs text-gray-500 italic">No configuration needed</p>;

    case "navigate":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">URL</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder="https://example.com"
              value={(config.url as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, url: e.target.value })}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Wait Until</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={(config.waitUntil as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, waitUntil: e.target.value || undefined })}
            >
              <option value="">Default</option>
              <option value="load">Load</option>
              <option value="domcontentloaded">DOM Content Loaded</option>
              <option value="networkidle">Network Idle</option>
              <option value="commit">Commit</option>
            </select>
          </div>
        </>
      );

    case "click":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Selector (fallback)</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            placeholder=".btn, #submit"
            value={(config.selector as string) ?? ""}
            onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
          />
          <p className="text-[10px] text-gray-400 mt-1">Optional if element pin is connected</p>
        </div>
      );

    case "type":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Selector (fallback)</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder="#search"
              value={(config.selector as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Optional if element pin is connected</p>
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Value</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="text to type"
              value={(config.value as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, value: e.target.value })}
            />
          </div>
        </>
      );

    case "wait":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Duration (ms)</label>
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              value={(config.durationMs as number) ?? 1000}
              onChange={(e) => onUpdate({ ...config, durationMs: parseInt(e.target.value, 10) || undefined })}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Or wait for selector</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder=".loaded"
              value={(config.selector as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
            />
          </div>
        </>
      );

    case "scroll":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Direction</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              value={(config.direction as string) ?? "down"}
              onChange={(e) => onUpdate({ ...config, direction: e.target.value })}
            >
              <option value="down">Down</option>
              <option value="up">Up</option>
              <option value="to">To element</option>
            </select>
          </div>
          {config.direction === "to" && (
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-600">Selector</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
                value={(config.selector as string) ?? ""}
                onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
              />
            </div>
          )}
        </>
      );

    case "select":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Selector</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder=".item, h1, a"
              value={(config.selector as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Mode</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={(config.mode as string) ?? "one"}
              onChange={(e) => onUpdate({ ...config, mode: e.target.value })}
            >
              <option value="one">Select One (single element)</option>
              <option value="all">Select All (multiple elements)</option>
            </select>
          </div>
          {(!config.mode || config.mode === "one") && (
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-600">Index</label>
              <input
                type="number"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                value={(config.index as number) ?? 0}
                onChange={(e) => onUpdate({ ...config, index: parseInt(e.target.value, 10) || 0 })}
              />
              <p className="text-[10px] text-gray-400 mt-1">Which matching element to pick (0-based)</p>
            </div>
          )}
        </>
      );

    case "extract":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Property</label>
            <select
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              value={(config.property as string) ?? "text"}
              onChange={(e) => onUpdate({ ...config, property: e.target.value })}
            >
              <option value="text">Text Content</option>
              <option value="attribute">Attribute</option>
              <option value="value">Input Value</option>
            </select>
          </div>
          {config.property === "attribute" && (
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-600">Attribute Name</label>
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
                placeholder="href, src, title"
                value={(config.attribute as string) ?? ""}
                onChange={(e) => onUpdate({ ...config, attribute: e.target.value })}
              />
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-2">Element input is required (connect from Select)</p>
        </>
      );

    case "output":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Property Path</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder="pageTitle, items.title"
              value={(config.propertyPath as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, propertyPath: e.target.value })}
            />
            <p className="text-[10px] text-gray-400 mt-1">
              Dot-path in result object. Use <code>[]</code> for array indexing with index pin.
            </p>
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Value Input</label>
            <p className="text-xs text-gray-500 mt-1">Connect a data pin to provide the value</p>
          </div>
        </>
      );

    case "loop":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Max Iterations</label>
            <input
              type="number"
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              value={(config.maxIterations as number) ?? 10}
              onChange={(e) => onUpdate({ ...config, maxIterations: parseInt(e.target.value, 10) || undefined })}
            />
            <p className="text-[10px] text-gray-400 mt-1">Leave empty for unlimited</p>
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Items Input</label>
            <p className="text-xs text-gray-500 mt-1">Connect a Select (mode: all) to the items pin</p>
          </div>
        </>
      );

    case "custom":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Handler Name</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            placeholder="myHandler"
            value={(config.handlerName as string) ?? ""}
            onChange={(e) => onUpdate({ ...config, handlerName: e.target.value })}
          />
        </div>
      );

    default:
      return null;
  }
}
