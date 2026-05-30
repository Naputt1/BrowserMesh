import type { WorkflowEvent } from '@browsermesh/workflow';

export type BrowserPaneProps = {
  readonly previewUrl?: string;
  readonly screenshotSrc?: string;
};

export function BrowserPane({ previewUrl, screenshotSrc }: BrowserPaneProps) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 border-b">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2 px-2 py-0.5 bg-white rounded text-xs text-gray-500 truncate border">
          {previewUrl ?? 'about:blank'}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-sm text-gray-400 overflow-hidden">
        {screenshotSrc ? (
          <img src={screenshotSrc} alt="Page preview" className="w-full h-full object-contain" />
        ) : previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            title="Browser preview"
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <span>No URL loaded</span>
        )}
      </div>
    </div>
  );
}

export function ScreenshotViewer({ events }: { readonly events?: readonly WorkflowEvent[] }) {
  const screenshots =
    events?.filter((e): e is WorkflowEvent & { type: 'screenshot' } => e.type === 'screenshot') ??
    [];

  if (screenshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border text-sm text-gray-400">
        No screenshots captured
      </div>
    );
  }

  const latest = screenshots[screenshots.length - 1];
  const blob = new Blob([latest.data.buffer as ArrayBuffer], { type: latest.mimeType });
  const url = URL.createObjectURL(blob);

  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-500">Latest: {latest.label}</div>
      <img src={url} alt={latest.label} className="w-full rounded-lg border" />
    </div>
  );
}
