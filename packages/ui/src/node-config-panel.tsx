import { useState } from "react";
import type { WorkflowNode } from "@browsermesh/workflow";

export type NodeConfigPanelProps = {
  node: { id: string; label: string; type: WorkflowNode["type"]; config: Record<string, unknown> } | null;
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
  type: WorkflowNode["type"];
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

function ConfigFields({ type, config, onUpdate }: ConfigFieldsProps) {
  switch (type) {
    case "navigate":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">URL</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            placeholder="https://example.com"
            value={(config.url as string) ?? ""}
            onChange={(e) => onUpdate({ ...config, url: e.target.value })}
          />
        </div>
      );

    case "click":
      return (
        <div>
          <label className="text-xs font-medium text-gray-600">Selector</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            placeholder=".btn, #submit, button"
            value={(config.selector as string) ?? ""}
            onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
          />
        </div>
      );

    case "type":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Selector</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder="#search, .input"
              value={(config.selector as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
            />
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
        <div>
          <label className="text-xs font-medium text-gray-600">Duration (ms)</label>
          <input
            type="number"
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
            value={(config.durationMs as number) ?? 1000}
            onChange={(e) => onUpdate({ ...config, durationMs: parseInt(e.target.value, 10) })}
          />
        </div>
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

    case "extract":
      return (
        <>
          <div>
            <label className="text-xs font-medium text-gray-600">Type Name</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder="Article, Product, etc."
              value={(config.typeName as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, typeName: e.target.value })}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Fields (JSON)</label>
            <textarea
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              rows={4}
              value={(config.fieldsJson as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, fieldsJson: e.target.value })}
            />
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
              onChange={(e) => onUpdate({ ...config, maxIterations: parseInt(e.target.value, 10) })}
            />
          </div>
          <div className="mt-2">
            <label className="text-xs font-medium text-gray-600">Selector</label>
            <input
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
              placeholder=".pagination .next"
              value={(config.selector as string) ?? ""}
              onChange={(e) => onUpdate({ ...config, selector: e.target.value })}
            />
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
