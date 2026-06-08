import { createRoute, useNavigate, useSearch } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { WorkflowBuilder, TaskConsole, ScreenshotViewer } from '@browsermesh/ui';
import { useWorkflowStore, useTaskStore } from '../../stores/workflow-store';
import { useTaskEvents } from '../../hooks/use-task-events';
import { executeWorkflow } from '../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import type { WorkflowDefinition, WorkflowEvent } from '@browsermesh/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

const EMPTY_EVENTS: readonly WorkflowEvent[] = [];

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows/new',
  component: NewWorkflowPage,
  validateSearch: (search: Record<string, unknown>) => ({
    load: (search.load as string | undefined) ?? undefined,
  }),
});

function NewWorkflowPage() {
  const navigate = useNavigate();
  const { load: loadId } = useSearch({ from: Route.id });
  const getLocalWorkflow = useWorkflowStore((s) => s.getLocalWorkflow);
  const saveWorkflowApi = useWorkflowStore((s) => s.saveWorkflow);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const loaded = useWorkflowStore((s) => s.loaded);
  const clearEvents = useTaskStore((s) => s.clearEvents);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [workflowDef, setWorkflowDef] = useState<WorkflowDefinition | undefined>();

  useEffect(() => {
    (async () => {
      if (!loaded) await loadWorkflows();
      if (loadId) {
        const local = getLocalWorkflow(loadId);
        if (local) setWorkflowDef(local.workflow);
      }
    })();
  }, [loadId, loaded, loadWorkflows, getLocalWorkflow]);

  const events = useTaskStore((s) =>
    taskId ? (s.eventsByTaskId[taskId] ?? EMPTY_EVENTS) : EMPTY_EVENTS,
  );
  useTaskEvents(taskId);

  const lastEvent = events[events.length - 1];
  const taskStatus: string =
    lastEvent?.type === 'task_completed'
      ? 'completed'
      : lastEvent?.type === 'task_failed'
        ? 'failed'
        : lastEvent?.type === 'task_started'
          ? 'running'
          : taskId
            ? 'pending'
            : '';

  const partialData = events.filter((e) => e.type === 'partial_data') as Extract<
    WorkflowEvent,
    { type: 'partial_data' }
  >[];
  const completedEvent = events.filter((e) => e.type === 'task_completed') as Extract<
    WorkflowEvent,
    { type: 'task_completed' }
  >[];
  const result = completedEvent[0]?.result;

  const handleWorkflowChange = useCallback((wf: WorkflowDefinition) => {
    setWorkflowDef(wf);
  }, []);

  const handleSave = async () => {
    if (!workflowDef) return;
    try {
      await saveWorkflowApi({ workflow: workflowDef });
      toast.success('Workflow saved');
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleRun = async () => {
    const wf = workflowDef;
    if (!wf) return;

    setRunning(true);
    try {
      const result = await executeWorkflow(wf);
      setTaskId(result.taskId);
      clearEvents(result.taskId);
    } catch (err) {
      toast.error(
        'Failed to start workflow: ' + (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <h2 className="text-sm font-semibold">Workflow Editor</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: '/workflows' })}
            className="px-3 py-1.5 text-xs font-medium rounded border hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {running ? 'Starting...' : 'Run Workflow'}
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 min-h-0">
          <WorkflowBuilder workflow={workflowDef} onWorkflowChange={handleWorkflowChange} />
        </div>

        {taskId && (
          <div className="border-t bg-white shrink-0 max-h-[50vh] overflow-y-auto">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Task Results</h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    taskStatus === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : taskStatus === 'failed'
                        ? 'bg-red-100 text-red-700'
                        : taskStatus === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {taskStatus || 'pending'}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  {taskId.slice(0, 16)}...
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {(partialData.length > 0 || result !== undefined) && (
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-xs">Extracted Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs">
                        {partialData.map((e, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 py-0.5 border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-purple-700 shrink-0 min-w-[60px]">
                              {e.path}
                            </span>
                            <span className="text-gray-700 font-mono break-all">
                              {typeof e.value === 'string' ? e.value : JSON.stringify(e.value)}
                            </span>
                          </div>
                        ))}
                        {result !== undefined && (
                          <div className="pt-1 border-t border-gray-200">
                            <span className="font-medium text-green-700">Result: </span>
                            <span className="font-mono text-gray-700">
                              {typeof result === 'string' ? result : JSON.stringify(result)}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="lg:col-span-2">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-xs">Console</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-48">
                      <TaskConsole events={events} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
