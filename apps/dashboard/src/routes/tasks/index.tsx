import { createRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as rootRoute } from "../__root";
import { listRunningTasks } from "../../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});

function TasksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["running-tasks"],
    queryFn: listRunningTasks,
    refetchInterval: 5000,
  });

  const tasks = data?.tasks ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-1">
          {tasks.length} running task{tasks.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Running Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No running tasks.</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => (
                <Link
                  key={task.taskId}
                  to="/tasks/$id"
                  params={{ id: task.taskId }}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-mono">{task.taskId}</div>
                    {task.message && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {task.message}
                      </div>
                    )}
                  </div>
                  <Badge>{task.state}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
