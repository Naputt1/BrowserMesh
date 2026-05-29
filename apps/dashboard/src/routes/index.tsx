import { createRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Route as rootRoute } from './__root';
import { listRunningTasks } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardHome,
});

function DashboardHome() {
  const {
    data: tasksData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['running-tasks'],
    queryFn: listRunningTasks,
    refetchInterval: 5000,
  });

  const runningTasks = tasksData?.tasks ?? [];
  const stateBadge = (state: string) => {
    const variant =
      state === 'running'
        ? ('default' as const)
        : state === 'paused'
          ? ('secondary' as const)
          : state === 'completed'
            ? ('secondary' as const)
            : ('outline' as const);
    return <Badge variant={variant}>{state}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your browser automation workflows.
          </p>
        </div>
        <Link
          to="/workflows/new"
          search={{ load: undefined }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          New Workflow
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Running Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{isLoading ? '...' : runningTasks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400' : 'bg-green-500'}`}
              />
              <span className="text-sm">{isLoading ? 'Checking...' : 'Connected'}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Quick Action</CardTitle>
          </CardHeader>
          <CardContent>
            <button onClick={() => refetch()} className="text-sm text-primary hover:underline">
              Refresh status
            </button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Running Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {runningTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No running tasks.</p>
          ) : (
            <div className="space-y-2">
              {runningTasks.map((task) => (
                <Link
                  key={task.taskId}
                  to="/tasks/$id"
                  params={{ id: task.taskId }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-mono text-muted-foreground">
                      {task.taskId.slice(0, 12)}...
                    </div>
                    {task.message && (
                      <div className="text-xs text-muted-foreground mt-0.5">{task.message}</div>
                    )}
                  </div>
                  {stateBadge(task.state)}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
