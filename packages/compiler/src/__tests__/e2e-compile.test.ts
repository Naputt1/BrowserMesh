import { describe, it, expect, afterAll } from 'vitest';
import { compileSource, cleanupWrappers } from '../compiler.js';

afterAll(async () => {
  await cleanupWrappers();
});

describe('e2e compiler pipeline', () => {
  it('compiles a full workflow with loops and validates IR structure', async () => {
    const source = `export const scrape = createWorkflow<{ title: string; data: string[] }>((wf) => {
  const page = wf
    .createPage()
    .navigate({ url: "https://example.com" })

  const title = page
    .select({ selector: "h1" })
    .text("title")

  const items = page
    .select({ selector: ".item" })
    .selectAll()

  const output: { title: string; data: string[] } = { title: "", data: [] }

  for (const item of items) {
    output.data.push(item.text())
  }

  return output
})`;

    const result = await compileSource(source, 'workflow.ts');
    expect(result).not.toBeNull();
    expect(result!.exportName).toBe('scrape');

    const ir = result!.ir;
    const types = ir.nodes.map((n) => n.type);

    // Must contain all expected node types
    expect(types).toContain('start');
    expect(types).toContain('end');
    expect(types).toContain('page');
    expect(types).toContain('navigate');
    expect(types).toContain('select');
    expect(types).toContain('extract');
    expect(types).toContain('output');
    expect(types).toContain('loop');

    const loopNode = ir.nodes.find((n) => n.type === 'loop')!;
    const loopBodyEdge = ir.edges.find(
      (e) => e.source === loopNode.id && e.sourceHandle === 'body',
    );
    expect(loopBodyEdge).toBeDefined();

    const flowFromStart = ir.edges.find((e) => e.sourceHandle === 'flow');
    expect(flowFromStart).toBeDefined();

    const rewritten = `import __ir from './workflow.ir.json';\nimport { createWorkflowLoader } from '@browsermesh/sdk';\n\nexport const ${result!.exportName} = createWorkflowLoader(__ir);\n`;
    expect(rewritten).toContain('createWorkflowLoader');
    expect(rewritten).not.toContain('createWorkflow<');

    console.log('Compiled workflow IR:');
    console.log(`  Nodes: ${ir.nodes.length} (types: ${types.join(', ')})`);
    console.log(`  Edges: ${ir.edges.length}`);
    console.log(`  Settings: ${JSON.stringify(ir.settings)}`);

    const json = JSON.stringify(ir);
    const parsed = JSON.parse(json);
    expect(parsed.nodes.length).toBe(ir.nodes.length);
  });
});
