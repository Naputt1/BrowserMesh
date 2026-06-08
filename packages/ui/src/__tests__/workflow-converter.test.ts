import { describe, it, expect } from 'vitest';
import {
  workflowToReactFlow,
  reactFlowToWorkflow,
  getNodeColor,
  getPinColor,
  getPinDataType,
  getEdgeStyle,
  isDataTypeAssignable,
} from '../lib/workflow-converter.js';
import { NODE_DEFINITIONS } from '@browsermesh/sdk';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  DataType,
} from '@browsermesh/sdk';

describe('workflowToReactFlow', () => {
  it('converts empty workflow', () => {
    const wf: WorkflowDefinition = { id: 'empty', nodes: [], edges: [] };
    const { nodes, edges } = workflowToReactFlow(wf);
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('converts nodes with correct shape', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [{ id: 'n1', type: 'navigate', config: { url: 'https://example.com' } }],
      edges: [],
    };
    const { nodes } = workflowToReactFlow(wf);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('n1');
    expect(nodes[0].type).toBe('workflowNode');
    expect(nodes[0].data.nodeType).toBe('navigate');
    expect(nodes[0].data.config.url).toBe('https://example.com');
  });

  it('converts edges', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [
        { id: 'n1', type: 'start' },
        { id: 'n2', type: 'end' },
      ],
      edges: [{ id: 'e1', source: 'n1', sourceHandle: 'flow', target: 'n2', targetHandle: 'flow' }],
    };
    const { edges } = workflowToReactFlow(wf);
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('n1');
    expect(edges[0].target).toBe('n2');
    expect(edges[0].type).toBe('smoothstep');
  });

  it('positions nodes without position by index', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [
        { id: 'a', type: 'start' },
        { id: 'b', type: 'end' },
      ],
      edges: [],
    };
    const { nodes } = workflowToReactFlow(wf);
    expect(nodes[0].position.x).toBe(60);
    expect(nodes[1].position.x).toBe(340);
    expect(nodes[0].position.y).toBe(200);
  });

  it('snaps positions to 20px grid', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [{ id: 'n1', type: 'start', position: { x: 103, y: 207 } }],
      edges: [],
    };
    const { nodes } = workflowToReactFlow(wf);
    expect(nodes[0].position.x).toBe(100);
    expect(nodes[0].position.y).toBe(200);
  });

  it('preserves existing positions when re-converting', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [{ id: 'n1', type: 'start' }],
      edges: [],
    };
    const first = workflowToReactFlow(wf);
    const second = workflowToReactFlow(wf, first.nodes);
    expect(second.nodes[0].position).toEqual(first.nodes[0].position);
  });

  it('overrides element pin data type for select mode=all', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [{ id: 'n1', type: 'select', config: { mode: 'all' } }],
      edges: [],
    };
    const { nodes } = workflowToReactFlow(wf);
    expect(nodes[0].data.pinDataTypes?.element).toEqual({ kind: 'array' });
  });

  it('does not override pin data type for select mode=one', () => {
    const wf: WorkflowDefinition = {
      id: 'test',
      nodes: [{ id: 'n1', type: 'select', config: { mode: 'one' } }],
      edges: [],
    };
    const { nodes } = workflowToReactFlow(wf);
    expect(nodes[0].data.pinDataTypes).toBeUndefined();
  });
});

describe('reactFlowToWorkflow', () => {
  it('converts React Flow nodes back to WorkflowNodes', () => {
    const rfNodes = [
      {
        id: 'n1',
        type: 'workflowNode',
        position: { x: 0, y: 0 },
        data: { label: 'Start', nodeType: 'start' as const, config: {} },
      },
      {
        id: 'n2',
        type: 'workflowNode',
        position: { x: 200, y: 0 },
        data: { label: 'End', nodeType: 'end' as const, config: {} },
      },
    ];
    const rfEdges = [
      { id: 'e1', source: 'n1', sourceHandle: 'flow', target: 'n2', targetHandle: 'flow' },
    ];
    const wf = reactFlowToWorkflow(rfNodes, rfEdges, 'wf1', 'Test', { multiPage: true });
    expect(wf.id).toBe('wf1');
    expect(wf.name).toBe('Test');
    expect(wf.settings?.multiPage).toBe(true);
    expect(wf.nodes).toHaveLength(2);
    expect(wf.nodes[0].type).toBe('start');
    expect(wf.nodes[1].type).toBe('end');
    expect(wf.edges).toHaveLength(1);
  });

  it('round-trips a workflow definition', () => {
    const original: WorkflowDefinition = {
      id: 'rt1',
      nodes: [
        { id: 'a', type: 'start' },
        { id: 'b', type: 'end' },
      ],
      edges: [{ id: 'ab', source: 'a', sourceHandle: 'flow', target: 'b', targetHandle: 'flow' }],
    };
    const rf = workflowToReactFlow(original);
    const result = reactFlowToWorkflow(rf.nodes, rf.edges);
    expect(result.nodes).toHaveLength(original.nodes.length);
    expect(result.edges).toHaveLength(original.edges.length);
    expect(result.nodes[0].type).toBe('start');
    expect(result.nodes[1].type).toBe('end');
    expect(result.edges[0].source).toBe('a');
    expect(result.edges[0].target).toBe('b');
  });
});

describe('getNodeColor', () => {
  for (const [type, def] of Object.entries(NODE_DEFINITIONS)) {
    it(`returns "${def.color}" for ${type}`, () => {
      expect(getNodeColor(type as any)).toBe(def.color);
    });
  }

  it('returns fallback color for unknown node type', () => {
    expect(getNodeColor('unknown' as any)).toBe('#6b7280');
  });
});

describe('getPinColor', () => {
  it('returns gray for flow pins', () => {
    expect(getPinColor('flow')).toBe('#9ca3af');
  });

  it('returns orange for pageKey pins', () => {
    expect(getPinColor('data', 'pageKey')).toBe('#f97316');
  });

  it('returns blue for regular data pins', () => {
    expect(getPinColor('data')).toBe('#3b82f6');
    expect(getPinColor('data', 'url')).toBe('#3b82f6');
  });
});

describe('getEdgeStyle', () => {
  it('returns orange stroke for pageKey edges', () => {
    expect(getEdgeStyle('pageKey')).toEqual({ stroke: '#f97316', strokeWidth: 2 });
  });

  it('returns empty style for flow handles', () => {
    expect(getEdgeStyle('flow')).toEqual({});
  });

  it('returns empty style for undefined handle', () => {
    expect(getEdgeStyle()).toEqual({});
  });
});

describe('getPinDataType', () => {
  it('returns pin data type from node definition', () => {
    const pin = NODE_DEFINITIONS.compare.outputs[1];
    expect(getPinDataType(undefined, pin, 'result')).toEqual({ kind: 'boolean' });
  });

  it('returns overridden pin data type from node data', () => {
    const pin = NODE_DEFINITIONS.select.outputs[1];
    const node: any = { data: { pinDataTypes: { element: { kind: 'array' } } } };
    expect(getPinDataType(node, pin, 'element')).toEqual({ kind: 'array' });
  });

  it('prefers node-level pinDataTypes over definition', () => {
    const pin = NODE_DEFINITIONS.select.outputs[1];
    const node: any = { data: { pinDataTypes: { element: { kind: 'array' } } } };
    expect(getPinDataType(node, pin, 'element')).toEqual({ kind: 'array' });
  });

  it('returns undefined when no pin or node data matched', () => {
    expect(getPinDataType(undefined, undefined, 'nonexistent')).toBeUndefined();
  });
});

describe('isDataTypeAssignable', () => {
  it('returns true when target is undefined (no constraint)', () => {
    expect(isDataTypeAssignable({ kind: 'string' }, undefined)).toBe(true);
    expect(isDataTypeAssignable(undefined, undefined)).toBe(true);
  });

  it('returns false when source is undefined but target has constraint', () => {
    expect(isDataTypeAssignable(undefined, { kind: 'string' })).toBe(false);
  });

  it('returns true for matching primitive kinds', () => {
    expect(isDataTypeAssignable({ kind: 'string' }, { kind: 'string' })).toBe(true);
    expect(isDataTypeAssignable({ kind: 'number' }, { kind: 'number' })).toBe(true);
    expect(isDataTypeAssignable({ kind: 'boolean' }, { kind: 'boolean' })).toBe(true);
  });

  it('returns false for mismatched primitive kinds', () => {
    expect(isDataTypeAssignable({ kind: 'string' }, { kind: 'number' })).toBe(false);
    expect(isDataTypeAssignable({ kind: 'number' }, { kind: 'boolean' })).toBe(false);
  });

  it('checks array element types', () => {
    const strArray: DataType = { kind: 'array', elementType: { kind: 'string' } };
    const numArray: DataType = { kind: 'array', elementType: { kind: 'number' } };
    expect(isDataTypeAssignable(strArray, strArray)).toBe(true);
    expect(isDataTypeAssignable(strArray, numArray)).toBe(false);
  });

  it('accepts any array when target has no element type', () => {
    const source: DataType = { kind: 'array', elementType: { kind: 'string' } };
    const target: DataType = { kind: 'array' };
    expect(isDataTypeAssignable(source, target)).toBe(true);
  });

  it('checks object field compatibility', () => {
    const source: DataType = {
      kind: 'object',
      fields: [{ name: 'title', type: { kind: 'string' } }],
    };
    const target: DataType = {
      kind: 'object',
      fields: [{ name: 'title', type: { kind: 'string' } }],
    };
    expect(isDataTypeAssignable(source, target)).toBe(true);
  });

  it('returns true when target object has no fields defined', () => {
    const source: DataType = {
      kind: 'object',
      fields: [{ name: 'title', type: { kind: 'string' } }],
    };
    expect(isDataTypeAssignable(source, { kind: 'object' })).toBe(true);
  });

  it('returns false when source object is missing required field', () => {
    const source: DataType = {
      kind: 'object',
      fields: [{ name: 'title', type: { kind: 'string' } }],
    };
    const target: DataType = {
      kind: 'object',
      fields: [
        { name: 'title', type: { kind: 'string' } },
        { name: 'price', type: { kind: 'number' } },
      ],
    };
    expect(isDataTypeAssignable(source, target)).toBe(false);
  });

  it('returns false when source object field type mismatches', () => {
    const source: DataType = {
      kind: 'object',
      fields: [{ name: 'count', type: { kind: 'string' } }],
    };
    const target: DataType = {
      kind: 'object',
      fields: [{ name: 'count', type: { kind: 'number' } }],
    };
    expect(isDataTypeAssignable(source, target)).toBe(false);
  });
});
