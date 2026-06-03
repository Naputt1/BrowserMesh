import { describe, it, expect } from 'vitest';
import type { WorkflowIR } from '@browsermesh/workflow';
import { resolveWorkflow, validateWorkflowIR, WorkflowValidationError } from '../index.js';

const validIR: WorkflowIR = {
  id: 'test',
  nodes: [
    { id: 'n1', type: 'start' },
    { id: 'n2', type: 'navigate', config: { url: 'https://example.com' } },
    { id: 'n3', type: 'end' },
  ],
  edges: [
    { id: 'e1', source: 'n1', sourceHandle: 'flow', target: 'n2', targetHandle: 'flow' },
    { id: 'e2', source: 'n2', sourceHandle: 'flow', target: 'n3', targetHandle: 'flow' },
  ],
};

describe('validateWorkflowIR', () => {
  it('passes for a valid IR', () => {
    const result = validateWorkflowIR(validIR);
    expect(result.id).toBe('test');
    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(2);
  });

  it('rejects null', () => {
    expect(() => validateWorkflowIR(null)).toThrow(WorkflowValidationError);
  });

  it('rejects non-object', () => {
    expect(() => validateWorkflowIR('string')).toThrow(WorkflowValidationError);
  });

  it('rejects missing id', () => {
    const { id: _, ...noId } = validIR;
    expect(() => validateWorkflowIR(noId)).toThrow(WorkflowValidationError);
  });

  it('rejects non-array nodes', () => {
    expect(() =>
      validateWorkflowIR({ ...validIR, nodes: 'not-array' }),
    ).toThrow(WorkflowValidationError);
  });

  it('rejects non-array edges', () => {
    expect(() =>
      validateWorkflowIR({ ...validIR, edges: 'not-array' }),
    ).toThrow(WorkflowValidationError);
  });

  it('rejects unknown node type', () => {
    expect(() =>
      validateWorkflowIR({
        ...validIR,
        nodes: [{ id: 'n1', type: 'unknown_type' }],
      }),
    ).toThrow(WorkflowValidationError);
  });

  it('rejects edge referencing unknown source node', () => {
    expect(() =>
      validateWorkflowIR({
        ...validIR,
        edges: [
          { id: 'e1', source: 'nonexistent', sourceHandle: 'flow', target: 'n2', targetHandle: 'flow' },
        ],
      }),
    ).toThrow(WorkflowValidationError);
  });

  it('rejects edge referencing unknown target node', () => {
    expect(() =>
      validateWorkflowIR({
        ...validIR,
        edges: [
          { id: 'e1', source: 'n1', sourceHandle: 'flow', target: 'nonexistent', targetHandle: 'flow' },
        ],
      }),
    ).toThrow(WorkflowValidationError);
  });
});

describe('resolveWorkflow', () => {
  it('resolves inline WorkflowIR object', async () => {
    const result = await resolveWorkflow(validIR);
    expect(result.id).toBe('test');
  });

  it('resolves InlineSource type', async () => {
    const result = await resolveWorkflow({ type: 'inline', ir: validIR });
    expect(result.id).toBe('test');
  });

  it('resolves JSON string inline', async () => {
    const result = await resolveWorkflow(JSON.stringify(validIR));
    expect(result.id).toBe('test');
  });

  it('rejects invalid JSON string', async () => {
    await expect(resolveWorkflow('not json at all')).rejects.toThrow(
      WorkflowValidationError,
    );
  });

  it('rejects unknown source type', async () => {
    await expect(
      resolveWorkflow({ type: 'unknown' } as any),
    ).rejects.toThrow(WorkflowValidationError);
  });

  it('resolves URL source (mocked fetch)', async () => {
    const originalFetch = globalThis.fetch;
    const mockResponse = new Response(JSON.stringify(validIR), {
      headers: { 'content-type': 'application/json' },
    });
    globalThis.fetch = async () => mockResponse;

    try {
      const result = await resolveWorkflow({ type: 'url', url: 'https://example.com/wf.json' });
      expect(result.id).toBe('test');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('resolves string URL source', async () => {
    const originalFetch = globalThis.fetch;
    const mockResponse = new Response(JSON.stringify(validIR), {
      headers: { 'content-type': 'application/json' },
    });
    globalThis.fetch = async () => mockResponse;

    try {
      const result = await resolveWorkflow('https://example.com/wf.json');
      expect(result.id).toBe('test');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects URL fetch on HTTP error', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(null, { status: 404 });

    try {
      await expect(
        resolveWorkflow('https://example.com/missing.json'),
      ).rejects.toThrow(WorkflowValidationError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('rejects S3 source when SDK is not installed', async () => {
    await expect(
      resolveWorkflow({ type: 's3', bucket: 'test', key: 'wf.json' }),
    ).rejects.toThrow(WorkflowValidationError);
  });
});
