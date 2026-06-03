import { describe, it, expect } from 'vitest';
import { createWorkflow, WorkflowBuilder, GraphBuilder } from '../index.js';
import type { WorkflowIR } from '@browsermesh/workflow';

describe('GraphBuilder', () => {
  it('creates nodes with sequential ids', () => {
    const g = new GraphBuilder();
    const id1 = g.addNode('start');
    const id2 = g.addNode('end');
    expect(id1).toBe('n_1');
    expect(id2).toBe('n_2');
  });

  it('tracks nodes', () => {
    const g = new GraphBuilder();
    g.addNode('start');
    g.addNode('navigate', { url: 'https://example.com' });
    g.addNode('end');
    expect(g.nodes).toHaveLength(3);
    expect(g.nodes[1].config?.url).toBe('https://example.com');
  });

  it('connects flow between nodes', () => {
    const g = new GraphBuilder();
    const a = g.addNode('start');
    g.connectFlow(a);
    const b = g.addNode('navigate');
    g.connectFlow(b);
    expect(g.edges).toHaveLength(1);
    expect(g.edges[0].source).toBe(a);
    expect(g.edges[0].target).toBe(b);
  });
});

describe('createWorkflow', () => {
  it('produces a WorkflowHandle with IR', () => {
    const workflow = createWorkflow<{ title: string }>((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
      const title = page.select({ selector: 'h1' }).text('title');
      return { title };
    });

    const ir = workflow.getIR();
    expect(ir).not.toBeNull();
    expect(ir!.nodes.length).toBeGreaterThan(0);
    expect(ir!.edges.length).toBeGreaterThan(0);
  });

  it('includes a start and end node', () => {
    const workflow = createWorkflow((wf) => {
      wf.createPage().navigate({ url: 'https://example.com' });
    });

    const ir = workflow.getIR()!;
    const types = ir.nodes.map((n) => n.type);
    expect(types).toContain('start');
    expect(types).toContain('end');
  });

  it('outputs correct node count for simple workflow', () => {
    const workflow = createWorkflow((wf) => {
      const page = wf
        .createPage()
        .navigate({ url: 'https://example.com' })
        .click({ selector: '.btn' })
        .wait({ durationMs: 1000 });
    });

    const ir = workflow.getIR()!;
    const nodeTypes = ir.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('start');
    expect(nodeTypes).toContain('page');
    expect(nodeTypes).toContain('navigate');
    expect(nodeTypes).toContain('click');
    expect(nodeTypes).toContain('wait');
    expect(nodeTypes).toContain('end');
  });

  it('outputs node with pageKey data edges', () => {
    const workflow = createWorkflow((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
    });

    const ir = workflow.getIR()!;
    const pageKeyEdges = ir.edges.filter((e) => e.sourceHandle === 'pageKey');
    expect(pageKeyEdges.length).toBeGreaterThan(0);
  });

  it('sets output type in settings from return value', () => {
    const workflow = createWorkflow<{ title: string; count: number }>((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
      const title = page.select({ selector: 'h1' }).text('title');
      return { title, count: 42 };
    });

    const ir = workflow.getIR()!;
    expect(ir.settings?.outputType).toBeDefined();
    expect(ir.settings!.outputType!.kind).toBe('object');
  });

  it('assigns property paths from return value structure', () => {
    const workflow = createWorkflow<{ title: string }>((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
      const title = page.select({ selector: 'h1' }).text('title');
      return { title };
    });

    const ir = workflow.getIR()!;
    const outputNodes = ir.nodes.filter((n) => n.type === 'output');
    expect(outputNodes.length).toBe(1);
    expect(outputNodes[0].config?.propertyPath).toBe('title');
  });
});

describe('createWorkflow with loops', () => {
  it('supports for..of loop compilation', () => {
    const workflow = createWorkflow<{ data: string[] }>((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
      const items = page.select({ selector: '.item' }).selectAll();

      const output: { data: string[] } = { data: [] };

      for (const item of items) {
        output.data.push(item.text());
      }

      return output;
    });

    const ir = workflow.getIR()!;
    const nodeTypes = ir.nodes.map((n) => n.type);
    expect(nodeTypes).toContain('loop');
    expect(nodeTypes).toContain('extract');
    expect(nodeTypes).toContain('output');

    const loopNode = ir.nodes.find((n) => n.type === 'loop');
    expect(loopNode).toBeDefined();

    const bodyEdge = ir.edges.find(
      (e) => e.source === loopNode!.id && e.sourceHandle === 'body',
    );
    expect(bodyEdge).toBeDefined();

    const itemDataEdge = ir.edges.find(
      (e) => e.source === loopNode!.id && e.sourceHandle === 'item',
    );
    expect(itemDataEdge).toBeDefined();

    const indexDataEdge = ir.edges.find(
      (e) => e.source === loopNode!.id && e.sourceHandle === 'index',
    );
    expect(indexDataEdge).toBeDefined();
  });

  it('assigns array property paths for loop outputs', () => {
    const workflow = createWorkflow<{ data: string[] }>((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
      const items = page.select({ selector: '.item' }).selectAll();

      const output: { data: string[] } = { data: [] };

      for (const item of items) {
        output.data.push(item.text());
      }

      return output;
    });

    const ir = workflow.getIR()!;
    const outputNodes = ir.nodes.filter((n) => n.type === 'output');
    expect(outputNodes.length).toBeGreaterThan(0);
    const loopOutput = outputNodes.find(
      (n) => n.config?.propertyPath === 'data[]',
    );
    expect(loopOutput).toBeDefined();
  });
});

describe('WorkflowBuilder.IR output', () => {
  it('produces valid WorkflowIR structure', () => {
    const workflow = createWorkflow((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
    });

    const ir = workflow.getIR()!;
    expect(ir).toHaveProperty('id');
    expect(ir).toHaveProperty('nodes');
    expect(ir).toHaveProperty('edges');
    expect(Array.isArray(ir.nodes)).toBe(true);
    expect(Array.isArray(ir.edges)).toBe(true);
  });

  it('produces runnable JSON (serializable)', () => {
    const workflow = createWorkflow((wf) => {
      const page = wf.createPage().navigate({ url: 'https://example.com' });
    });

    const ir = workflow.getIR()!;
    const json = JSON.stringify(ir);
    const parsed = JSON.parse(json) as WorkflowIR;
    expect(parsed.nodes.length).toBe(ir.nodes.length);
    expect(parsed.edges.length).toBe(ir.edges.length);
  });
});
