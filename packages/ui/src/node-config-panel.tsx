import { X } from "lucide-react";
import { useState, useMemo } from "react";
import type { DataType, NodeType } from "@browsermesh/workflow";
import { NODE_DEFINITIONS } from "@browsermesh/workflow";

export type NodeConfigPanelProps = {
  node: { id: string; label: string; type: NodeType; config: Record<string, unknown> } | null;
  onUpdate: (id: string, updates: { label?: string; config?: Record<string, unknown> }) => void;
  onDelete: (id: string) => void;
  outputType?: DataType;
  multiPage?: boolean;
  allNodes?: readonly { id: string; label?: string; type: NodeType }[];
};

export function NodeConfigPanel({ node, onUpdate, onDelete, outputType, multiPage, allNodes }: NodeConfigPanelProps) {
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

        <ConfigFields type={node.type} config={node.config} onUpdate={(cfg) => onUpdate(node.id, { config: cfg })} outputType={outputType} allNodes={allNodes} />

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
  outputType?: DataType;
  allNodes?: readonly { id: string; label?: string; type: NodeType }[];
};

function ConfigFields({ type, config, onUpdate, outputType, allNodes }: ConfigFieldsProps) {
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
            <p className="text-[10px] text-gray-400 mt-1">Or connect URL from data pin</p>
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
          <p className="text-[10px] text-gray-400 mt-2">Connect pageKey from Page node to target a specific tab</p>
        </>
      );

    case "click":
      return (
        <>
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
          <p className="text-[10px] text-gray-400 mt-2">Connect pageKey from Page node to target a specific tab</p>
        </>
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
            <p className="text-[10px] text-gray-400 mt-1">Connect pageKey from Page node to target a specific tab</p>
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
          <p className="text-[10px] text-gray-400 mt-2">Connect pageKey from Page node to target a specific tab</p>
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
        <OutputConfigFields
          config={config}
          onUpdate={onUpdate}
          outputType={outputType}
        />
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

    case "fetch":
      return <FetchConfigFields config={config} onUpdate={onUpdate} allNodes={allNodes} />;

    case "listen":
      return <ListenConfigFields config={config} onUpdate={onUpdate} />;

    case "state":
      return <StateConfigFields config={config} onUpdate={onUpdate} />;

    case "page":
      return <PageConfigFields config={config} onUpdate={onUpdate} />;

    default:
      return null;
  }
}

type LeafPath = { name: string; path: string };

function collectLeafPaths(type: DataType, prefix: string = ""): LeafPath[] {
  if (type.kind === "object") {
    return (type.fields ?? []).flatMap((f) => {
      const fieldPath = prefix ? `${prefix}.${f.name}` : f.name;
      if (f.type.kind === "string" || f.type.kind === "number" || f.type.kind === "boolean") {
        return [{ name: f.name, path: fieldPath }];
      }
      if (f.type.kind === "object") return collectLeafPaths(f.type, fieldPath);
      if (f.type.kind === "array" && f.type.elementType) return collectLeafPaths(f.type.elementType, `${fieldPath}[]`);
      return [];
    });
  }
  if (type.kind === "array" && type.elementType) {
    return collectLeafPaths(type.elementType, `[]`);
  }
  return [];
}

function pathDepth(path: string): number {
  return (path.match(/\[\]/g) ?? []).length;
}

function OutputConfigFields({
  config,
  onUpdate,
  outputType,
}: {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  outputType?: DataType;
}) {
  const leafPaths = useMemo(() => (outputType ? collectLeafPaths(outputType) : []), [outputType]);
  const currentPath = (config.propertyPath as string) ?? "";
  const currentDepth = pathDepth(currentPath);

  return (
    <>
      <div>
        <label className="text-xs font-medium text-gray-600">Output Field</label>
        {leafPaths.length > 0 ? (
          <select
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm font-mono"
            value={currentPath}
            onChange={(e) => onUpdate({ ...config, propertyPath: e.target.value })}
          >
            <option value="">— select field —</option>
            {leafPaths.map((lp) => (
              <option key={lp.path} value={lp.path}>
                {lp.name} ({lp.path})
              </option>
            ))}
          </select>
        ) : (
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            placeholder="pageTitle or [].title"
            value={currentPath}
            onChange={(e) => onUpdate({ ...config, propertyPath: e.target.value })}
          />
        )}
      </div>

      {currentPath && (
        <div className="text-[10px] text-gray-400 space-y-1">
          {currentDepth > 0 && (
            <p>Requires <strong>index</strong> input ({currentDepth} array level{currentDepth > 1 ? "s" : ""})</p>
          )}
          {currentDepth === 0 && <p>Direct field — no index required</p>}
        </div>
      )}

      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">Value Input</label>
        <p className="text-xs text-gray-500 mt-1">Connect a data pin to provide the value</p>
      </div>
    </>
  );
}

function KVPairEditor({
  label,
  pairs,
  onChange,
}: {
  label: string;
  pairs: Array<{ key: string; value: string }>;
  onChange: (pairs: Array<{ key: string; value: string }>) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="mt-1 space-y-1">
        {pairs.map((pair, i) => (
          <div key={i} className="flex gap-1">
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
              placeholder="key"
              value={pair.key}
              onChange={(e) => {
                const next = [...pairs];
                next[i] = { ...next[i], key: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
              placeholder="value (supports ${var})"
              value={pair.value}
              onChange={(e) => {
                const next = [...pairs];
                next[i] = { ...next[i], value: e.target.value };
                onChange(next);
              }}
            />
            <button
              onClick={() => onChange(pairs.filter((_, j) => j !== i))}
              className="text-red-500 hover:text-red-700 p-1"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...pairs, { key: "", value: "" }])}
        className="mt-1 text-xs text-blue-600 hover:text-blue-800"
      >
        + Add {label.toLowerCase()}
      </button>
    </div>
  );
}

function FetchConfigFields({
  config,
  onUpdate,
  allNodes,
}: {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
  allNodes?: readonly { id: string; label?: string; type: NodeType }[];
}) {
  const headers = (config.headers as Array<{ key: string; value: string }>) ?? [];
  const queryParams = (config.queryParams as Array<{ key: string; value: string }>) ?? [];
  const fetchNodes = allNodes?.filter((n) => n.type === "fetch" && n.id !== undefined) ?? [];

  const copyFrom = config.copyFromNodeId as string | undefined;
  const selectedCopyLabel = copyFrom
    ? fetchNodes.find((n) => n.id === copyFrom)?.label ?? copyFrom
    : "";

  return (
    <>
      <div>
        <label className="text-xs font-medium text-gray-600">Method</label>
        <select
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={(config.method as string) ?? "GET"}
          onChange={(e) => onUpdate({ ...config, method: e.target.value })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>

      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">URL</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
          placeholder="https://api.example.com/data?page=${var}"
          value={(config.url as string) ?? ""}
          onChange={(e) => onUpdate({ ...config, url: e.target.value, variables: extractVariables(e.target.value, headers, queryParams, config.body as string | undefined) })}
        />
        <p className="text-[10px] text-gray-400 mt-1">Use {'${variableName}'} for dynamic values. Or connect URL from data pin</p>
      </div>

      <KVPairEditor
        label="Query Params"
        pairs={queryParams}
        onChange={(pairs) => onUpdate({ ...config, queryParams: pairs, variables: extractVariables(config.url as string ?? "", headers, pairs, config.body as string | undefined) })}
      />

      {config.method && config.method !== "GET" && config.method !== "HEAD" && (
        <div className="mt-2">
          <label className="text-xs font-medium text-gray-600">Body</label>
          <textarea
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
            rows={3}
            placeholder={'{"key": "${var}"}'}
            value={(config.body as string) ?? ""}
            onChange={(e) => onUpdate({ ...config, body: e.target.value, variables: extractVariables(config.url as string ?? "", headers, queryParams, e.target.value) })}
          />
        </div>
      )}

      <KVPairEditor
        label="Headers"
        pairs={headers}
        onChange={(pairs) => onUpdate({ ...config, headers: pairs, variables: extractVariables(config.url as string ?? "", pairs, queryParams, config.body as string | undefined) })}
      />

      {fetchNodes.length > 0 && (
        <div className="mt-2">
          <label className="text-xs font-medium text-gray-600">Copy Headers From</label>
          <div className="flex gap-1 mt-1">
            <select
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs"
              value={copyFrom ?? ""}
              onChange={(e) => onUpdate({ ...config, copyFromNodeId: e.target.value || undefined })}
            >
              <option value="">— select —</option>
              {fetchNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.label}
                </option>
              ))}
            </select>
            {copyFrom && (
              <button
                onClick={() => {
                  const source = allNodes?.find((n) => n.id === copyFrom);
                  if (source) {
                    const sourceConfig = (source as any).config ?? {};
                    const sourceHeaders = (sourceConfig.headers as Array<{ key: string; value: string }>) ?? [];
                    onUpdate({ ...config, headers: JSON.parse(JSON.stringify(sourceHeaders)) });
                  }
                }}
                className="px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded"
            checked={config.actLikeNavigation !== false}
            onChange={(e) => onUpdate({ ...config, actLikeNavigation: e.target.checked })}
          />
          <span className="text-xs font-medium text-gray-600">Act like navigation (apply delay)</span>
        </label>
      </div>
    </>
  );
}

function extractVariables(
  url: string,
  headers: Array<{ key: string; value: string }>,
  queryParams: Array<{ key: string; value: string }>,
  body: string | undefined,
): string[] {
  const pattern = /\$\{(\w+)\}/g;
  const vars = new Set<string>();
  let m: RegExpExecArray | null;
  const all = [url, ...headers.map((h) => h.value), ...queryParams.map((q) => q.value), body ?? ""].join(" ");
  while ((m = pattern.exec(all)) !== null) {
    vars.add(m[1]);
  }
  return Array.from(vars);
}

function ListenConfigFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const patterns = (config.urlPatterns as string[]) ?? [];

  return (
    <>
      <div>
        <label className="text-xs font-medium text-gray-600">URL Patterns</label>
        <p className="text-[10px] text-gray-400 mb-1">One per line, use * as wildcard</p>
        <textarea
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
          rows={4}
          placeholder="/api/data/*\n*/users"
          value={patterns.join("\n")}
          onChange={(e) => onUpdate({ ...config, urlPatterns: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
        />
      </div>

      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">Wait After Inject (ms)</label>
        <input
          type="number"
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={(config.waitMs as number) ?? 500}
          onChange={(e) => onUpdate({ ...config, waitMs: parseInt(e.target.value, 10) || 0 })}
        />
        <p className="text-[10px] text-gray-400 mt-1">Time to wait for requests to be captured</p>
      </div>

      <div className="mt-2 space-y-1">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded"
            checked={config.captureResponse !== false}
            onChange={(e) => onUpdate({ ...config, captureResponse: e.target.checked })}
          />
          <span className="text-xs font-medium text-gray-600">Capture response body</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded"
            checked={config.injectOnNavigate !== false}
            onChange={(e) => onUpdate({ ...config, injectOnNavigate: e.target.checked })}
          />
          <span className="text-xs font-medium text-gray-600">Re-inject on navigation</span>
        </label>
      </div>
    </>
  );
}

function StateConfigFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  return (
    <>
      <div>
        <label className="text-xs font-medium text-gray-600">Operation</label>
        <select
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={(config.operation as string) ?? "get"}
          onChange={(e) => onUpdate({ ...config, operation: e.target.value })}
        >
          <option value="get">Get</option>
          <option value="set">Set</option>
          <option value="increment">Increment</option>
          <option value="delete">Delete</option>
          <option value="commit">Commit (persist)</option>
        </select>
      </div>

      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">Key</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
          placeholder="processedIndex"
          value={(config.key as string) ?? ""}
          onChange={(e) => onUpdate({ ...config, key: e.target.value })}
        />
      </div>

      {config.operation === "get" && (
        <div className="mt-2">
          <label className="text-xs font-medium text-gray-600">Default Value</label>
          <input
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
            placeholder="0"
            value={config.defaultValue !== undefined ? String(config.defaultValue) : ""}
            onChange={(e) => onUpdate({ ...config, defaultValue: e.target.value || undefined })}
          />
          <p className="text-[10px] text-gray-400 mt-1">Returned if key doesn't exist</p>
        </div>
      )}

      <div className="mt-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="rounded"
            checked={config.persistToFile !== false}
            onChange={(e) => onUpdate({ ...config, persistToFile: e.target.checked })}
          />
          <span className="text-xs font-medium text-gray-600">Persist to file (crash recovery)</span>
        </label>
      </div>
    </>
  );
}

function PageConfigFields({
  config,
  onUpdate,
}: {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  const action = (config.action as string) ?? "create";

  return (
    <>
      <div>
        <label className="text-xs font-medium text-gray-600">Action</label>
        <select
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
          value={action}
          onChange={(e) => onUpdate({ ...config, action: e.target.value })}
        >
          <option value="create">Create Tab</option>
          <option value="select">Select Tab</option>
          <option value="close">Close Tab</option>
        </select>
      </div>

      <div className="mt-2">
        <label className="text-xs font-medium text-gray-600">Page Key</label>
        <input
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none font-mono"
          placeholder="tab1"
          value={(config.pageId as string) ?? ""}
          onChange={(e) => onUpdate({ ...config, pageId: e.target.value })}
        />
        <p className="text-[10px] text-gray-400 mt-1">Identifier for this tab. Output connects to other nodes</p>
      </div>
    </>
  );
}
