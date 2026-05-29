export type NodeType =
  | 'start'
  | 'end'
  | 'navigate'
  | 'click'
  | 'type'
  | 'wait'
  | 'scroll'
  | 'select'
  | 'extract'
  | 'output'
  | 'loop'
  | 'custom'
  | 'fetch'
  | 'listen'
  | 'state'
  | 'page'
  | 'if'
  | 'switch'
  | 'and'
  | 'or'
  | 'not'
  | 'break'
  | 'compare'
  | 'continue';

export type PinType = 'flow' | 'data';

export type PinDescriptor = {
  readonly name: string;
  readonly type: PinType;
  readonly label?: string;
  readonly required?: boolean;
  readonly dataType?: DataType;
};

export type WorkflowNode = {
  readonly id: string;
  readonly type: NodeType;
  readonly label?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly config?: Record<string, unknown>;
  readonly pageId?: string;
};

export type WorkflowEdge = {
  readonly id: string;
  readonly source: string;
  readonly sourceHandle: string;
  readonly target: string;
  readonly targetHandle: string;
};

export type TimingControls = {
  readonly minDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly typingSpeed?: 'instant' | 'fast' | 'human' | 'slow';
  readonly requestJitter?: boolean;
  readonly scrollSimulation?: boolean;
  readonly randomMouseMovement?: boolean;
  readonly idleWaits?: boolean;
};

export type DataType = {
  readonly kind: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly name?: string;
  readonly fields?: readonly DataTypeField[];
  readonly elementType?: DataType;
};

export type DataTypeField = {
  readonly name: string;
  readonly type: DataType;
};

export type GlobalSettings = {
  readonly timing?: TimingControls;
  readonly outputType?: DataType;
  readonly multiPage?: boolean;
  readonly statePersistence?: boolean;
};

export type WorkflowDefinition = {
  readonly id: string;
  readonly name?: string;
  readonly version?: string;
  readonly settings?: GlobalSettings;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
};

export type NodeTypeDefinition = {
  readonly type: NodeType;
  readonly label: string;
  readonly color: string;
  readonly category: string;
  readonly inputs: readonly PinDescriptor[];
  readonly outputs: readonly PinDescriptor[];
};

const pin = (name: string, type: PinType, overrides?: Partial<PinDescriptor>): PinDescriptor => ({
  name,
  type,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  ...overrides,
});

export const NODE_DEFINITIONS: Record<NodeType, NodeTypeDefinition> = {
  start: {
    type: 'start',
    label: 'Start',
    color: '#6b7280',
    category: 'flow',
    inputs: [],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  end: {
    type: 'end',
    label: 'End',
    color: '#6b7280',
    category: 'flow',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [],
  },
  navigate: {
    type: 'navigate',
    label: 'Navigate',
    color: '#3b82f6',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('url', 'data', { label: 'URL' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  click: {
    type: 'click',
    label: 'Click',
    color: '#22c55e',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('element', 'data', { label: 'Element' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  type: {
    type: 'type',
    label: 'Type',
    color: '#f59e0b',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('element', 'data', { label: 'Element' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  wait: {
    type: 'wait',
    label: 'Wait',
    color: '#a855f7',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  scroll: {
    type: 'scroll',
    label: 'Scroll',
    color: '#64748b',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('element', 'data', { label: 'Element' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  select: {
    type: 'select',
    label: 'Select',
    color: '#14b8a6',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('element', 'data', { label: 'Element' }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('element', 'data', { label: 'Element', required: true }),
    ],
  },
  extract: {
    type: 'extract',
    label: 'Extract',
    color: '#14b8a6',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('element', 'data', { label: 'Element', required: true }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('value', 'data', { label: 'Value', required: true }),
    ],
  },
  output: {
    type: 'output',
    label: 'Output',
    color: '#14b8a6',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('value', 'data', { label: 'Value', required: true }),
      pin('index', 'data', { label: 'Index' }),
    ],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  loop: {
    type: 'loop',
    label: 'Loop',
    color: '#f97316',
    category: 'flow',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('items', 'data', { label: 'Items', required: true, dataType: { kind: 'array' } }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('body', 'flow', { label: 'Body', required: true }),
      pin('index', 'data', { label: 'Index' }),
      pin('item', 'data', { label: 'Item' }),
    ],
  },
  custom: {
    type: 'custom',
    label: 'Custom',
    color: '#6b7280',
    category: 'action',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [pin('flow', 'flow', { required: true })],
  },
  fetch: {
    type: 'fetch',
    label: 'Fetch Request',
    color: '#8b5cf6',
    category: 'action',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key' }),
      pin('url', 'data', { label: 'URL' }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('response', 'data', { label: 'Response', required: true, dataType: { kind: 'object' } }),
    ],
  },
  listen: {
    type: 'listen',
    label: 'Listen Requests',
    color: '#ec4899',
    category: 'action',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('requests', 'data', {
        label: 'Requests',
        dataType: { kind: 'array', elementType: { kind: 'object' } },
      }),
    ],
  },
  state: {
    type: 'state',
    label: 'Global State',
    color: '#06b6d4',
    category: 'flow',
    inputs: [pin('flow', 'flow', { required: true }), pin('value', 'data', { label: 'Value' })],
    outputs: [pin('flow', 'flow', { required: true }), pin('value', 'data', { label: 'Value' })],
  },
  page: {
    type: 'page',
    label: 'Page/Tab',
    color: '#0ea5e9',
    category: 'action',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('pageKey', 'data', { label: 'Page Key', required: true, dataType: { kind: 'string' } }),
    ],
  },
  break: {
    type: 'break',
    label: 'Break',
    color: '#ef4444',
    category: 'flow',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [],
  },
  compare: {
    type: 'compare',
    label: 'Compare',
    color: '#6366f1',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('left', 'data', { label: 'Left', required: true }),
      pin('right', 'data', { label: 'Right', required: true }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('result', 'data', { label: 'Result', required: true, dataType: { kind: 'boolean' } }),
    ],
  },
  and: {
    type: 'and',
    label: 'And',
    color: '#06b6d4',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('a', 'data', { label: 'A', required: true, dataType: { kind: 'boolean' } }),
      pin('b', 'data', { label: 'B', required: true, dataType: { kind: 'boolean' } }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('result', 'data', { label: 'Result', required: true, dataType: { kind: 'boolean' } }),
    ],
  },
  or: {
    type: 'or',
    label: 'Or',
    color: '#f59e0b',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('a', 'data', { label: 'A', required: true, dataType: { kind: 'boolean' } }),
      pin('b', 'data', { label: 'B', required: true, dataType: { kind: 'boolean' } }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('result', 'data', { label: 'Result', required: true, dataType: { kind: 'boolean' } }),
    ],
  },
  not: {
    type: 'not',
    label: 'Not',
    color: '#ec4899',
    category: 'data',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('value', 'data', { label: 'Value', required: true, dataType: { kind: 'boolean' } }),
    ],
    outputs: [
      pin('flow', 'flow', { required: true }),
      pin('result', 'data', { label: 'Result', required: true, dataType: { kind: 'boolean' } }),
    ],
  },
  continue: {
    type: 'continue',
    label: 'Continue',
    color: '#10b981',
    category: 'flow',
    inputs: [pin('flow', 'flow', { required: true })],
    outputs: [],
  },
  if: {
    type: 'if',
    label: 'If',
    color: '#f59e0b',
    category: 'flow',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('condition', 'data', {
        label: 'Condition',
        required: true,
        dataType: { kind: 'boolean' },
      }),
    ],
    outputs: [pin('true', 'flow', { label: 'True' }), pin('false', 'flow', { label: 'False' })],
  },
  switch: {
    type: 'switch',
    label: 'Switch',
    color: '#8b5cf6',
    category: 'flow',
    inputs: [
      pin('flow', 'flow', { required: true }),
      pin('value', 'data', { label: 'Value', required: true }),
    ],
    outputs: [pin('default', 'flow', { label: 'Default' })],
  },
};

export const CATEGORIES = [
  { value: 'flow', label: 'Flow' },
  { value: 'action', label: 'Actions' },
  { value: 'data', label: 'Data' },
] as const;

export type ExtractionScope<TOutput = unknown> = {
  readonly id: string;
  readonly parentId?: string;
  readonly outputType: string;
  readonly path: readonly string[];
  readonly mode: 'object' | 'array';
  readonly sample?: TOutput;
};

export type WorkflowEvent =
  | TaskStartedEvent
  | StepStartedEvent
  | StepCompletedEvent
  | PartialDataEvent
  | LogEvent
  | ScreenshotEvent
  | ProgressEvent
  | TaskCompletedEvent
  | TaskFailedEvent;

export type WorkflowEventBase<TType extends string> = {
  readonly type: TType;
  readonly taskId: string;
  readonly timestamp: string;
};

export type TaskStartedEvent = WorkflowEventBase<'task_started'> & {
  readonly workflowId: string;
};

export type StepStartedEvent = WorkflowEventBase<'step_started'> & {
  readonly stepId: string;
  readonly stepType: NodeType;
};

export type StepCompletedEvent = WorkflowEventBase<'step_completed'> & {
  readonly stepId: string;
  readonly output?: unknown;
};

export type PartialDataEvent = WorkflowEventBase<'partial_data'> & {
  readonly path: string;
  readonly value: unknown;
};

export type LogEvent = WorkflowEventBase<'log'> & {
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly message: string;
};

export type ScreenshotEvent = WorkflowEventBase<'screenshot'> & {
  readonly label: string;
  readonly data: Uint8Array;
  readonly mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
};

export type ProgressEvent = WorkflowEventBase<'progress'> & {
  readonly completedSteps: number;
  readonly totalSteps: number;
  readonly message?: string;
};

export type TaskCompletedEvent = WorkflowEventBase<'task_completed'> & {
  readonly result?: unknown;
};

export type TaskFailedEvent = WorkflowEventBase<'task_failed'> & {
  readonly errorCode: string;
  readonly message: string;
  readonly retryable: boolean;
};
