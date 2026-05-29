import { createRoute, useParams, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { useTaskStore } from '../../stores/workflow-store';
import { useTaskEvents } from '../../hooks/use-task-events';
import { cancelTask, pauseTask, resumeTask } from '../../lib/api';
import { TaskConsole, ScreenshotViewer } from '@browsermesh/ui';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import type { WorkflowEvent } from '@browsermesh/workflow';

const EMPTY_EVENTS: readonly WorkflowEvent[] = [];

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/tasks/$id',
  component: TaskDetailPage,
});

function TaskDetailPage() {
  const { id: taskId } = useParams({ from: Route.id });
  const navigate = useNavigate();
  const events = useTaskStore((s) => s.eventsByTaskId[taskId]) ?? EMPTY_EVENTS;

  useTaskEvents(taskId);

  const lastEvent = events[events.length - 1];
  const status: string =
    lastEvent?.type === 'task_completed'
      ? 'completed'
      : lastEvent?.type === 'task_failed'
        ? 'failed'
        : lastEvent?.type === 'task_started'
          ? 'running'
          : 'pending';

  const handleCancel = async () => {
    try {
      await cancelTask(taskId);
    } catch {
      /* ignore */
    }
  };

  const handlePause = async () => {
    try {
      await pauseTask(taskId);
    } catch {
      /* ignore */
    }
  };

  const handleResume = async () => {
    try {
      await resumeTask(taskId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold font-mono text-sm">{taskId}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                status === 'completed'
                  ? 'bg-green-100 text-green-700'
                  : status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : status === 'running'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
              }`}
            >
              {status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {events.length} event{events.length !== 1 ? 's' : ''} received
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: '/tasks' })}
            className="px-3 py-1.5 text-xs font-medium rounded border hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          {status === 'running' && (
            <>
              <button
                onClick={handlePause}
                className="px-3 py-1.5 text-xs font-medium rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 text-xs font-medium rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {status === 'paused' && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 text-xs font-medium rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
            >
              Resume
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="h-[500px] flex flex-col">
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-sm">Event Log</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <TaskConsole events={events} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Extracted Data</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const partialData = events.filter((e) => e.type === 'partial_data') as Extract<
                  WorkflowEvent,
                  { type: 'partial_data' }
                >[];
                const completedEvent = events.filter((e) => e.type === 'task_completed') as Extract<
                  WorkflowEvent,
                  { type: 'task_completed' }
                >[];
                const result = completedEvent[0]?.result;
                if (partialData.length === 0 && result === undefined) {
                  return <p className="text-sm text-muted-foreground">No data extracted yet.</p>;
                }
                return (
                  <div className="space-y-2 text-sm">
                    {partialData.length > 0 && (
                      <div className="space-y-1">
                        {partialData.map((e, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 py-1 border-b border-gray-100 last:border-0"
                          >
                            <span className="font-medium text-purple-700 shrink-0 min-w-[80px]">
                              {e.path}
                            </span>
                            <span className="text-gray-700 font-mono text-xs break-all">
                              {typeof e.value === 'string' ? e.value : JSON.stringify(e.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {result !== undefined && (
                      <div className="pt-2 border-t border-gray-200">
                        <span className="font-medium text-green-700">Result: </span>
                        <span className="font-mono text-xs text-gray-700">
                          {typeof result === 'string' ? result : JSON.stringify(result)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              <ScreenshotViewer events={events} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Task Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Task ID</span>
                  <span className="font-mono text-xs">{taskId.slice(0, 16)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>{status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Events</span>
                  <span>{events.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
