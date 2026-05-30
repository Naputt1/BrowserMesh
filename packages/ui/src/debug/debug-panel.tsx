import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/workflow';
import { DebugController } from './debug-controller';

export type DebugPanelProps = {
  readonly workflow: WorkflowDefinition;
  readonly runtimeUrl: string;
  readonly onEvent?: (event: WorkflowEvent) => void;
  readonly onCurrentStepChange?: (stepId: string | null) => void;
};

export function DebugPanel({ workflow, runtimeUrl, onEvent, onCurrentStepChange }: DebugPanelProps) {
  const controllerRef = useRef<DebugController | null>(null);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const screenshotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const controller = new DebugController({ runtimeUrl });
    controllerRef.current = controller;
    return () => {
      controller.stop();
      if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    };
  }, [runtimeUrl]);

  const startScreenshotPolling = useCallback(() => {
    if (screenshotIntervalRef.current) clearInterval(screenshotIntervalRef.current);
    screenshotIntervalRef.current = setInterval(async () => {
      const img = await controllerRef.current?.captureScreenshot();
      if (img) setScreenshot(`data:image/png;base64,${img}`);
    }, 1000);
  }, []);

  const stopScreenshotPolling = useCallback(() => {
    if (screenshotIntervalRef.current) {
      clearInterval(screenshotIntervalRef.current);
      screenshotIntervalRef.current = null;
    }
  }, []);

  const handleStart = useCallback(async () => {
    setError(null);
    try {
      const controller = controllerRef.current;
      if (!controller) return;

      await controller.start(workflow);
      setRunning(true);
      setDone(false);

      controllerRef.current = controller;
      startScreenshotPolling();

      controller.execute(true);

      const pollInterval = setInterval(() => {
        const events = controller.events;
        const lastEvent = events[events.length - 1];
        if (lastEvent) {
          onEvent?.(lastEvent);
          if (lastEvent.type === 'step_paused') {
            setCurrentStep(lastEvent.stepId);
            onCurrentStepChange?.(lastEvent.stepId);
          }
          if (lastEvent.type === 'step_completed' && currentStep === lastEvent.stepId) {
            setCurrentStep(null);
            onCurrentStepChange?.(null);
          }
          if (lastEvent.type === 'task_completed' || lastEvent.type === 'task_failed') {
            setDone(true);
            setRunning(false);
            stopScreenshotPolling();
            clearInterval(pollInterval);
          }
        }
        if (controller.isDone) {
          setDone(true);
          setRunning(false);
          stopScreenshotPolling();
          clearInterval(pollInterval);
        }
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setRunning(false);
    }
  }, [workflow, onEvent, onCurrentStepChange, currentStep, startScreenshotPolling, stopScreenshotPolling]);

  const handleStep = useCallback(async () => {
    try {
      await controllerRef.current?.step();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleContinue = useCallback(async () => {
    try {
      await controllerRef.current?.runAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const handleStop = useCallback(async () => {
    await controllerRef.current?.stop();
    setRunning(false);
    setDone(true);
    stopScreenshotPolling();
  }, [stopScreenshotPolling]);
  const devToolsFrontendUrl = controllerRef.current?.devToolsFrontendUrl ?? null;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!running && !done && (
          <button onClick={handleStart} className="px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
            Start Debug
          </button>
        )}
        {running && (
          <>
            <button onClick={handleStep} className="px-3 py-1.5 text-xs font-medium rounded bg-green-500 text-white hover:bg-green-600 transition-colors">
              Step
            </button>
            <button onClick={handleContinue} className="px-3 py-1.5 text-xs font-medium rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors">
              Continue
            </button>
            <button onClick={handleStop} className="px-3 py-1.5 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors">
              Stop
            </button>
          </>
        )}
        {done && (
          <button onClick={handleStart} className="px-3 py-1.5 text-xs font-medium rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors">
            Restart
          </button>
        )}
        {running && <span className="text-xs text-gray-500">Debug running...</span>}
        {done && <span className="text-xs text-green-600">Debug completed</span>}
      </div>

      {currentStep && (
        <div className="text-xs text-gray-600 bg-gray-50 rounded px-3 py-2 border">
          Current step: <span className="font-mono font-medium">{currentStep}</span>
        </div>
      )}

      {(running || done) && (
        <div className="border rounded-lg overflow-hidden bg-gray-50 flex flex-col h-[400px]">
          <div className="px-3 py-1.5 bg-gray-100 border-b text-xs font-medium text-gray-600 flex items-center justify-between shrink-0">
            <span>Live Page Preview</span>
            {running && <span className="text-green-500 text-[10px] animate-pulse">● Live</span>}
          </div>
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            {screenshot ? (
              <img src={screenshot} alt="Page preview" className="max-w-full max-h-full object-contain rounded shadow border" />
            ) : (
              <span className="text-xs text-gray-400">Waiting for page content...</span>
            )}
          </div>
        </div>
      )}

      {devToolsFrontendUrl && (
        <div className="border rounded-lg overflow-hidden flex flex-col h-[600px]">
          <div className="px-3 py-1.5 bg-gray-100 border-b text-xs font-medium text-gray-600 shrink-0">
            DevTools Inspector
          </div>
          <iframe
            src={devToolsFrontendUrl}
            className="w-full flex-1 border-0"
            title="DevTools"
            allow="autofocus"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}
