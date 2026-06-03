import { describe, it, expect, afterAll } from 'vitest';
import { extractWorkflow, compileSource, rewriteSource, getIrFilename, cleanupWrappers } from '../compiler.js';

afterAll(async () => {
  await cleanupWrappers();
});

describe('extractWorkflow', () => {
  it('extracts export const createWorkflow call', () => {
    const source = `export const scrape = createWorkflow<{ title: string }>((wf) => {
  const page = wf.createPage().navigate({ url: "https://example.com" })
  return { title: "" }
})`;

    const result = extractWorkflow(source);
    expect(result).not.toBeNull();
    expect(result!.exportName).toBe('scrape');
    expect(result!.builderCode).toContain('(wf) => {');
    expect(result!.builderCode).toContain('createPage()');
  });

  it('extracts without export keyword', () => {
    const source = `const workflow = createWorkflow((wf) => {
  wf.createPage().navigate({ url: "https://example.com" })
})`;

    const result = extractWorkflow(source);
    expect(result).not.toBeNull();
    expect(result!.exportName).toBe('workflow');
  });

  it('extracts without generics', () => {
    const source = `export const foo = createWorkflow((wf) => {
  wf.createPage()
})`;

    const result = extractWorkflow(source);
    expect(result).not.toBeNull();
    expect(result!.exportName).toBe('foo');
  });

  it('returns null for non-matching source', () => {
    const source = `const x = 42`;
    const result = extractWorkflow(source);
    expect(result).toBeNull();
  });

  it('returns null for named function syntax', () => {
    const source = `export const bar = createWorkflow(function(wf) {
  wf.createPage()
})`;

    const result = extractWorkflow(source);
    expect(result).toBeNull();
  });
});

describe('compileSource', () => {
  it('compiles a simple createWorkflow call', async () => {
    const source = `export const test = createWorkflow((wf) => {
  const page = wf.createPage().navigate({ url: "https://example.com" })
  page.select({ selector: "h1" }).text("title")
  return { title: "" }
})`;

    const result = await compileSource(source, 'test.ts');
    expect(result).not.toBeNull();
    expect(result!.exportName).toBe('test');
    expect(result!.ir.nodes.length).toBeGreaterThan(0);
    expect(result!.ir.edges.length).toBeGreaterThan(0);
  });

  it('compiles a loop workflow', async () => {
    const source = `export const loop = createWorkflow((wf) => {
  const page = wf.createPage().navigate({ url: "https://example.com" })
  const items = page.select({ selector: ".item" }).selectAll()
  const output = { data: [] }
  for (const item of items) {
    output.data.push(item.text())
  }
  return output
})`;

    const result = await compileSource(source, 'loop.ts');
    expect(result).not.toBeNull();
    expect(result!.ir.nodes.filter((n) => n.type === 'loop').length).toBe(1);
    expect(result!.ir.nodes.filter((n) => n.type === 'extract').length).toBeGreaterThan(0);
  });

  it('fails for non-workflow source', async () => {
    const source = `const x = 42`;
    const result = await compileSource(source, 'test.ts');
    expect(result).toBeNull();
  });

  it('compiled IR is valid JSON', async () => {
    const source = `export const test = createWorkflow((wf) => {
  wf.createPage().navigate({ url: "https://example.com" })
})`;

    const result = await compileSource(source, 'test.ts');
    const json = JSON.stringify(result!.ir);
    const parsed = JSON.parse(json);
    expect(parsed.nodes).toBeDefined();
    expect(parsed.edges).toBeDefined();
  });
});

describe('rewriteSource', () => {
  it('replaces createWorkflow with createWorkflowLoader', () => {
    const source = `export const scrape = createWorkflow<{ title: string }>((wf) => {
  const page = wf.createPage()
  return { title: "" }
})`;

    const result = extractWorkflow(source)!;
    expect(result).not.toBeNull();

    const compiled = {
      exportName: result.exportName,
      ir: { id: 'test', nodes: [], edges: [] } as any,
      source,
      fullMatchStart: result.fullMatchStart,
      fullMatchEnd: result.fullMatchEnd,
    };

    const rewritten = rewriteSource(source, compiled, './scrape.ir.json');

    expect(rewritten).toContain('createWorkflowLoader');
    expect(rewritten).toContain('scrape.ir.json');
    expect(rewritten).not.toContain('createWorkflow<');
  });
});

describe('getIrFilename', () => {
  it('converts .ts to .ir.json', () => {
    expect(getIrFilename('/path/to/workflow.ts')).toBe('workflow.ir.json');
  });

  it('converts .mts to .ir.json', () => {
    expect(getIrFilename('scraper.mts')).toBe('scraper.ir.json');
  });
});
