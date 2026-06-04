import { createRoute, Link, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { useWorkflowStore } from '../../stores/workflow-store';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows',
  component: WorkflowsPage,
});

function WorkflowsPage() {
  const navigate = useNavigate();
  const workflows = useWorkflowStore((s) => s.workflows);
  const loaded = useWorkflowStore((s) => s.loaded);
  const loading = useWorkflowStore((s) => s.loading);
  const loadWorkflows = useWorkflowStore((s) => s.loadWorkflows);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);

  useEffect(() => {
    if (!loaded && !loading) loadWorkflows();
  }, [loaded, loading, loadWorkflows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            {loading
              ? 'Loading...'
              : `${workflows.length} saved workflow${workflows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/workflows/ts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
          >
            New TS Workflow
          </Link>
          <Link
            to="/workflows/new"
            search={{ load: undefined }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            New Visual
          </Link>
        </div>
      </div>

      {workflows.length === 0 && !loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No saved workflows yet.</p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/workflows/new"
                search={{ load: undefined }}
                className="text-sm text-primary hover:underline"
              >
                Create a visual workflow
              </Link>
              <span className="text-muted-foreground text-sm">or</span>
              <Link to="/workflows/ts" className="text-sm text-primary hover:underline">
                Create a TS workflow
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-base">{w.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={w.type === 'compiled' ? 'default' : 'secondary'}>
                    {w.type === 'compiled' ? 'Compiled TS' : 'Visual'}
                  </Badge>
                  <Badge variant="outline">{w.workflow.nodes.length} nodes</Badge>
                  <Badge variant="outline">{w.workflow.edges.length} edges</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Updated {new Date(w.updatedAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate({ to: '/workflows/new', search: { load: w.id } })}
                    className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteWorkflow(w.id)}
                    className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
