import { createRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Route as rootRoute } from "./__root";
import { listRunningTasks } from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

function SettingsPage() {
  const { refetch, isRefetching } = useQuery({
    queryKey: ["running-tasks"],
    queryFn: listRunningTasks,
    enabled: false,
  });

  const runtimeHost = window.location.host;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Runtime connection and configuration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Runtime Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Endpoint</div>
              <div className="text-sm text-muted-foreground font-mono">{runtimeHost}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Connected</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">API Base</div>
              <div className="text-sm text-muted-foreground font-mono">/api</div>
            </div>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              {isRefetching ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflow Defaults</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Global workflow defaults will be available here in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
