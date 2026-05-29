import { describe, it, expect } from 'vitest';
import { NODE_DEFINITIONS, CATEGORIES } from '../index.js';

const ALL_NODE_TYPES = [
  'start',
  'end',
  'navigate',
  'click',
  'type',
  'wait',
  'scroll',
  'select',
  'extract',
  'output',
  'loop',
  'custom',
  'fetch',
  'listen',
  'state',
  'page',
  'if',
  'switch',
  'and',
  'or',
  'not',
  'break',
  'compare',
  'continue',
] as const;

const VALID_CATEGORIES = CATEGORIES.map((c) => c.value);

describe('CATEGORIES', () => {
  it('has three categories', () => {
    expect(CATEGORIES).toHaveLength(3);
  });

  it('each category has value and label', () => {
    for (const cat of CATEGORIES) {
      expect(cat.value).toBeDefined();
      expect(cat.label).toBeDefined();
    }
  });

  it('includes flow, action, and data', () => {
    expect(VALID_CATEGORIES).toContain('flow');
    expect(VALID_CATEGORIES).toContain('action');
    expect(VALID_CATEGORIES).toContain('data');
  });
});

describe('NODE_DEFINITIONS', () => {
  it('has exactly the expected number of definitions', () => {
    expect(Object.keys(NODE_DEFINITIONS).length).toBe(ALL_NODE_TYPES.length);
  });

  it('covers every NodeType in the union', () => {
    for (const t of ALL_NODE_TYPES) {
      expect(NODE_DEFINITIONS[t]).toBeDefined();
    }
  });

  it('every definition has the required shape', () => {
    for (const [type, def] of Object.entries(NODE_DEFINITIONS)) {
      expect(def.type).toBe(type);
      expect(typeof def.label).toBe('string');
      expect(def.label.length).toBeGreaterThan(0);
      expect(def.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(VALID_CATEGORIES).toContain(def.category);
      expect(Array.isArray(def.inputs)).toBe(true);
      expect(Array.isArray(def.outputs)).toBe(true);
    }
  });

  it('every definition has unique type-value matching its key', () => {
    for (const [key, def] of Object.entries(NODE_DEFINITIONS)) {
      expect(def.type).toBe(key);
    }
  });

  it('every pin in every definition has name and valid type', () => {
    for (const def of Object.values(NODE_DEFINITIONS)) {
      for (const pin of [...def.inputs, ...def.outputs]) {
        expect(typeof pin.name).toBe('string');
        expect(pin.name.length).toBeGreaterThan(0);
        expect(pin.type).toMatch(/^(flow|data)$/);
      }
    }
  });

  it('every required data pin with type constraint has dataType', () => {
    for (const def of Object.values(NODE_DEFINITIONS)) {
      for (const pin of [...def.inputs, ...def.outputs]) {
        if (pin.type === 'data' && pin.required && pin.dataType) {
          expect(['string', 'number', 'boolean', 'object', 'array']).toContain(pin.dataType.kind);
        }
      }
    }
  });

  it('pure flow control nodes (start/end/break/continue) use only flow pins', () => {
    const flowNodes = ['start', 'end', 'break', 'continue'];
    for (const type of flowNodes) {
      const def = NODE_DEFINITIONS[type as keyof typeof NODE_DEFINITIONS];
      for (const pin of [...def.inputs, ...def.outputs]) {
        expect(pin.type).toBe('flow');
      }
    }
  });

  it('data output nodes have at least one data output', () => {
    const dataNodes = ['select', 'extract', 'compare', 'and', 'or', 'not'];
    for (const type of dataNodes) {
      const def = NODE_DEFINITIONS[type as keyof typeof NODE_DEFINITIONS];
      expect(def.outputs.some((p) => p.type === 'data')).toBe(true);
    }
  });

  it('action nodes have at least flow output', () => {
    const actionNodes = [
      'navigate',
      'click',
      'type',
      'wait',
      'scroll',
      'custom',
      'fetch',
      'listen',
      'page',
    ];
    for (const type of actionNodes) {
      const def = NODE_DEFINITIONS[type as keyof typeof NODE_DEFINITIONS];
      expect(def.outputs.some((p) => p.type === 'flow')).toBe(true);
    }
  });

  it('start has no inputs and one flow output', () => {
    const def = NODE_DEFINITIONS.start;
    expect(def.inputs).toHaveLength(0);
    expect(def.outputs).toHaveLength(1);
    expect(def.outputs[0].type).toBe('flow');
    expect(def.outputs[0].required).toBe(true);
  });

  it('end has one flow input and no outputs', () => {
    const def = NODE_DEFINITIONS.end;
    expect(def.inputs).toHaveLength(1);
    expect(def.inputs[0].type).toBe('flow');
    expect(def.inputs[0].required).toBe(true);
    expect(def.outputs).toHaveLength(0);
  });

  it('break and continue have one flow input and no outputs', () => {
    for (const type of ['break', 'continue'] as const) {
      const def = NODE_DEFINITIONS[type];
      expect(def.inputs).toHaveLength(1);
      expect(def.inputs[0].type).toBe('flow');
      expect(def.outputs).toHaveLength(0);
    }
  });

  it('if has boolean condition input and two flow outputs', () => {
    const def = NODE_DEFINITIONS.if;
    expect(def.inputs).toHaveLength(2);
    expect(def.inputs[1].name).toBe('condition');
    expect(def.inputs[1].dataType?.kind).toBe('boolean');
    expect(def.outputs).toHaveLength(2);
    expect(def.outputs[0].name).toBe('true');
    expect(def.outputs[1].name).toBe('false');
  });

  it('switch has value input and default flow output', () => {
    const def = NODE_DEFINITIONS.switch;
    expect(def.inputs.some((p) => p.name === 'value')).toBe(true);
    expect(def.outputs.some((p) => p.name === 'default')).toBe(true);
  });

  it('compare outputs boolean result', () => {
    const def = NODE_DEFINITIONS.compare;
    expect(def.outputs.some((p) => p.name === 'result' && p.dataType?.kind === 'boolean')).toBe(
      true,
    );
  });

  it('logical operators (and, or, not) have boolean inputs and output', () => {
    for (const type of ['and', 'or', 'not'] as const) {
      const def = NODE_DEFINITIONS[type];
      for (const pin of def.inputs) {
        if (pin.type === 'data') {
          expect(pin.dataType?.kind).toBe('boolean');
        }
      }
      for (const pin of def.outputs) {
        if (pin.type === 'data') {
          expect(pin.dataType?.kind).toBe('boolean');
        }
      }
    }
  });

  it('loop has flow body output', () => {
    const def = NODE_DEFINITIONS.loop;
    expect(def.outputs.some((p) => p.name === 'body' && p.type === 'flow')).toBe(true);
  });

  it('navigate has pageKey and url inputs', () => {
    const def = NODE_DEFINITIONS.navigate;
    expect(def.inputs.some((p) => p.name === 'pageKey')).toBe(true);
    expect(def.inputs.some((p) => p.name === 'url')).toBe(true);
  });

  it('every color is a valid 6-digit hex code', () => {
    for (const def of Object.values(NODE_DEFINITIONS)) {
      expect(def.color).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
