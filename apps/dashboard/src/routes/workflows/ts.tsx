import { createRoute, useNavigate } from '@tanstack/react-router';
import { Route as rootRoute } from '../__root';
import { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { useWorkflowStore } from '../../stores/workflow-store';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { compileWorkflow } from '../../lib/api';
import type { WorkflowRecord } from '../../lib/api';

const DEFAULT_SOURCE = `import { createWorkflow } from '@browsermesh/sdk';

const workflow = createWorkflow('my-workflow', async ({ page }) => {
  await page.goto('https://example.com');
  const title = await page.getText('h1');
  return { title };
});

export default workflow;
`;

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workflows/ts',
  component: TsWorkflowPage,
});

function TsWorkflowPage() {
  const navigate = useNavigate();
  const saveWorkflow = useWorkflowStore((s) => s.saveWorkflow);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [compiling, setCompiling] = useState(false);
  const [compiled, setCompiled] = useState<WorkflowRecord | null>(null);

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const startState = EditorState.create({
      doc: DEFAULT_SOURCE,
      extensions: [
        keymap.of(defaultKeymap),
        javascript({ typescript: true }),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setSource(update.state.doc.toString());
            setCompiled(null);
          }
        }),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
      ],
    });

    const view = new EditorView({
      state: startState,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  const handleCompile = async () => {
    setCompiling(true);
    setCompiled(null);
    try {
      const result = await compileWorkflow(source);
      setCompiled(result);
      toast.success('Compilation successful');
    } catch (err) {
      toast.error('Compilation failed: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setCompiling(false);
    }
  };

  const handleSave = async () => {
    if (!compiled) {
      toast.error('Compile the workflow first');
      return;
    }
    try {
      await saveWorkflow({
        id: compiled.id,
        name: compiled.name,
        workflow: compiled.workflow,
        type: 'compiled',
        source,
      });
      toast.success('Workflow saved');
      navigate({ to: '/workflows' });
    } catch (err) {
      toast.error('Failed to save: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shrink-0">
        <h2 className="text-sm font-semibold">TypeScript Workflow</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate({ to: '/workflows' })}
            className="px-3 py-1.5 text-xs font-medium rounded border hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleCompile}
            disabled={compiling}
            className="px-3 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {compiling ? 'Compiling...' : 'Compile'}
          </button>
          <button
            onClick={handleSave}
            disabled={!compiled}
            className="px-3 py-1.5 text-xs font-medium rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div ref={editorRef} className="flex-1 min-w-0" />

        {compiled && (
          <div className="w-96 border-l bg-white overflow-y-auto">
            <div className="p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold mb-2">Compiled Workflow</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="default">Compiled TS</Badge>
                  <Badge variant="outline">{compiled.workflow.nodes.length} nodes</Badge>
                  <Badge variant="outline">{compiled.workflow.edges.length} edges</Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-1">
                  Name: <span className="font-mono">{compiled.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: <span className="font-mono">{compiled.id.slice(0, 16)}...</span>
                </p>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Nodes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    {compiled.workflow.nodes.map((n) => (
                      <div key={n.id} className="flex items-center gap-2 py-0.5">
                        <span className="text-purple-700 font-medium">{n.id}</span>
                        <span className="text-muted-foreground">{n.type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs">Edges</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs">
                    {compiled.workflow.edges.map((e) => (
                      <div key={e.id} className="flex items-center gap-1 py-0.5 font-mono">
                        <span className="text-blue-700">{e.source}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-blue-700">{e.target}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
