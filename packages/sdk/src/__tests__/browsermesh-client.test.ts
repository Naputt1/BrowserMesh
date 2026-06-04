import { describe, it, expect, vi } from 'vitest';
import { BrowserMeshClient } from '../index';
import type { WorkflowEvent } from '@browsermesh/workflow';

function mockGrpcClient() {
  return {
    ExecuteWorkflow: vi.fn(),
    CancelTask: vi.fn(),
    PauseTask: vi.fn(),
    ResumeTask: vi.fn(),
    GetTaskStatus: vi.fn(),
    ListRunningTasks: vi.fn(),
    GetWorkflowState: vi.fn(),
    SetWorkflowState: vi.fn(),
  };
}

function createClient(grpcClient: ReturnType<typeof mockGrpcClient>) {
  return new BrowserMeshClient({
    endpoint: 'localhost:50051',
    _grpcClient: grpcClient as unknown as object,
  });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) {
    items.push(item);
  }
  return items;
}

async function* asyncStream(items: object[]) {
  for (const item of items) {
    yield item;
  }
}

describe('BrowserMeshClient — executeWorkflow (streaming)', () => {
  it('yields decoded events from the gRPC stream', async () => {
    const mock = mockGrpcClient();
    const timestamp = new Date().toISOString();
    const rawEvents: object[] = [
      { task_id: 't1', timestamp, task_started: { workflow_id: 'w1' } },
      { task_id: 't1', timestamp, step_started: { step_id: 'n1', step_type: 'navigate' } },
      { task_id: 't1', timestamp, step_completed: { step_id: 'n1', output_json: undefined } },
    ];
    mock.ExecuteWorkflow.mockReturnValue(asyncStream(rawEvents));

    const client = createClient(mock);
    const events = await collect(
      client.executeWorkflow({ workflow: { id: 'w1', nodes: [], edges: [] } }),
    );

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ type: 'task_started', taskId: 't1', workflowId: 'w1' });
    expect(events[1]).toMatchObject({ type: 'step_started', stepId: 'n1', stepType: 'navigate' });
    expect(events[2]).toMatchObject({ type: 'step_completed', stepId: 'n1' });
    expect(mock.ExecuteWorkflow).toHaveBeenCalledWith({
      task_id: '',
      workflow_json: JSON.stringify({ id: 'w1', nodes: [], edges: [] }),
    });
  });

  it('parses output_json in step_completed events', async () => {
    const mock = mockGrpcClient();
    const timestamp = new Date().toISOString();
    mock.ExecuteWorkflow.mockReturnValue(
      asyncStream([
        {
          task_id: 't1',
          timestamp,
          step_completed: { step_id: 'n1', output_json: JSON.stringify({ result: 'ok' }) },
        },
      ]),
    );

    const client = createClient(mock);
    const events = await collect(
      client.executeWorkflow({ taskId: 't1', workflow: { id: 'w1', nodes: [], edges: [] } }),
    );

    expect(events[0]).toMatchObject({ type: 'step_completed', output: { result: 'ok' } });
  });

  it('handles an empty stream', async () => {
    const mock = mockGrpcClient();
    mock.ExecuteWorkflow.mockReturnValue(asyncStream([]));

    const client = createClient(mock);
    const events = await collect(
      client.executeWorkflow({ workflow: { id: 'w1', nodes: [], edges: [] } }),
    );

    expect(events).toHaveLength(0);
  });

  it('propagates streaming errors', async () => {
    const mock = mockGrpcClient();
    mock.ExecuteWorkflow.mockReturnValue(
      (async function* () {
        throw new Error('stream error');
      })(),
    );

    const client = createClient(mock);
    await expect(
      collect(client.executeWorkflow({ workflow: { id: 'w1', nodes: [], edges: [] } })),
    ).rejects.toThrow('stream error');
  });

  it('decodes all event types', async () => {
    const mock = mockGrpcClient();
    const ts = new Date().toISOString();
    const rawEvents: object[] = [
      { task_id: 't1', timestamp: ts, task_started: { workflow_id: 'w1' } },
      { task_id: 't1', timestamp: ts, step_started: { step_id: 'n1', step_type: 'click' } },
      { task_id: 't1', timestamp: ts, step_completed: { step_id: 'n1', output_json: '"done"' } },
      { task_id: 't1', timestamp: ts, partial_data: { path: 'title', value_json: '"hello"' } },
      { task_id: 't1', timestamp: ts, log: { level: 'info', message: 'log msg' } },
      {
        task_id: 't1',
        timestamp: ts,
        screenshot: { label: 'ss1', data: new Uint8Array([1, 2, 3]), mime_type: 'image/png' },
      },
      {
        task_id: 't1',
        timestamp: ts,
        progress: { completed_steps: 1, total_steps: 3, message: '1/3' },
      },
      { task_id: 't1', timestamp: ts, task_completed: { result_json: '{"ok":true}' } },
      {
        task_id: 't1',
        timestamp: ts,
        task_failed: { error_code: 'E001', message: 'failed', retryable: false },
      },
    ];
    mock.ExecuteWorkflow.mockReturnValue(asyncStream(rawEvents));

    const client = createClient(mock);
    const events = await collect(
      client.executeWorkflow({ workflow: { id: 'w1', nodes: [], edges: [] } }),
    );

    expect(events).toHaveLength(9);
    expect(events[0].type).toBe('task_started');
    expect(events[1].type).toBe('step_started');
    expect(events[2].type).toBe('step_completed');
    expect(events[3].type).toBe('partial_data');
    expect(events[4].type).toBe('log');
    expect(events[5].type).toBe('screenshot');
    expect(events[6].type).toBe('progress');
    expect(events[7].type).toBe('task_completed');
    expect(events[8].type).toBe('task_failed');

    const failed = events[8] as Extract<WorkflowEvent, { type: 'task_failed' }>;
    expect(failed.errorCode).toBe('E001');
    expect(failed.retryable).toBe(false);
  });
});

describe('BrowserMeshClient — unary RPCs', () => {
  it('cancelTask calls CancelTask and maps response', async () => {
    const mock = mockGrpcClient();
    mock.CancelTask.mockImplementation((_req: object, cb: Function) =>
      cb(null, { task_id: 't1', state: 'cancelled', message: 'by user' }),
    );

    const client = createClient(mock);
    const result = await client.cancelTask('t1');

    expect(result).toEqual({ taskId: 't1', state: 'cancelled', message: 'by user' });
    expect(mock.CancelTask).toHaveBeenCalledWith({ task_id: 't1' }, expect.any(Function));
  });

  it('pauseTask calls PauseTask and maps response', async () => {
    const mock = mockGrpcClient();
    mock.PauseTask.mockImplementation((_req: object, cb: Function) =>
      cb(null, { task_id: 't1', state: 'paused', message: 'paused by user' }),
    );

    const client = createClient(mock);
    const result = await client.pauseTask('t1');

    expect(result).toEqual({ taskId: 't1', state: 'paused', message: 'paused by user' });
  });

  it('resumeTask calls ResumeTask and maps response', async () => {
    const mock = mockGrpcClient();
    mock.ResumeTask.mockImplementation((_req: object, cb: Function) =>
      cb(null, { task_id: 't1', state: 'running' }),
    );

    const client = createClient(mock);
    const result = await client.resumeTask('t1');

    expect(result).toEqual({ taskId: 't1', state: 'running', message: undefined });
  });

  it('getTaskStatus maps response', async () => {
    const mock = mockGrpcClient();
    mock.GetTaskStatus.mockImplementation((_req: object, cb: Function) =>
      cb(null, { task_id: 't1', state: 'running' }),
    );

    const client = createClient(mock);
    const result = await client.getTaskStatus('t1');

    expect(result).toEqual({ taskId: 't1', state: 'running', message: undefined });
  });

  it('listRunningTasks calls ListRunningTasks and maps response', async () => {
    const mock = mockGrpcClient();
    mock.ListRunningTasks.mockImplementation((_req: object, cb: Function) =>
      cb(null, {
        tasks: [
          { task_id: 't1', state: 'running' },
          { task_id: 't2', state: 'paused', message: 'waiting' },
        ],
      }),
    );

    const client = createClient(mock);
    const result = await client.listRunningTasks();

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ taskId: 't1', state: 'running', message: undefined });
    expect(result[1]).toEqual({ taskId: 't2', state: 'paused', message: 'waiting' });
  });

  it('listRunningTasks returns empty array for empty response', async () => {
    const mock = mockGrpcClient();
    mock.ListRunningTasks.mockImplementation((_req: object, cb: Function) =>
      cb(null, { tasks: [] }),
    );

    const client = createClient(mock);
    const result = await client.listRunningTasks();

    expect(result).toEqual([]);
  });
});

describe('BrowserMeshClient — error handling', () => {
  it('propagates errors from unary calls', async () => {
    const mock = mockGrpcClient();
    mock.CancelTask.mockImplementation((_req: object, cb: Function) =>
      cb(new Error('not found'), null),
    );

    const client = createClient(mock);
    await expect(client.cancelTask('unknown')).rejects.toThrow('not found');
  });

  it('propagates errors from listRunningTasks', async () => {
    const mock = mockGrpcClient();
    mock.ListRunningTasks.mockImplementation((_req: object, cb: Function) =>
      cb(new Error('server error'), null),
    );

    const client = createClient(mock);
    await expect(client.listRunningTasks()).rejects.toThrow('server error');
  });
});

describe('BrowserMeshClient — state management', () => {
  it('getWorkflowState returns parsed state', async () => {
    const mock = mockGrpcClient();
    mock.GetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(null, {
        workflow_id: 'w1',
        state_json: JSON.stringify({ page: 3, items: ['a', 'b'] }),
        recovered: false,
      }),
    );

    const client = createClient(mock);
    const result = await client.getWorkflowState('w1');

    expect(result).toEqual({
      workflowId: 'w1',
      state: { page: 3, items: ['a', 'b'] },
      recovered: false,
    });
    expect(mock.GetWorkflowState).toHaveBeenCalledWith({ workflow_id: 'w1' }, expect.any(Function));
  });

  it('getWorkflowState works with primitive number state', async () => {
    const mock = mockGrpcClient();
    mock.GetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(null, { workflow_id: 'counter', state_json: '42', recovered: true }),
    );

    const client = createClient(mock);
    const result = await client.getWorkflowState<number>('counter');

    expect(result.state).toBe(42);
  });

  it('getWorkflowState returns undefined state when state_json is empty', async () => {
    const mock = mockGrpcClient();
    mock.GetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(null, { workflow_id: 'empty', state_json: '', recovered: false }),
    );

    const client = createClient(mock);
    const result = await client.getWorkflowState('empty');

    expect(result.state).toBeUndefined();
  });

  it('setWorkflowState serializes and sends state', async () => {
    const mock = mockGrpcClient();
    mock.SetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(null, {
        workflow_id: 'w1',
        state_json: JSON.stringify({ page: 4 }),
        recovered: false,
      }),
    );

    const client = createClient(mock);
    const result = await client.setWorkflowState('w1', { page: 4 }, { commit: true });

    expect(result).toEqual({
      workflowId: 'w1',
      state: { page: 4 },
      recovered: false,
    });
    expect(mock.SetWorkflowState).toHaveBeenCalledWith(
      { workflow_id: 'w1', state_json: '{"page":4}', commit: true },
      expect.any(Function),
    );
  });

  it('setWorkflowState defaults commit to false', async () => {
    const mock = mockGrpcClient();
    mock.SetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(null, { workflow_id: 'w1', state_json: '{}', recovered: false }),
    );

    const client = createClient(mock);
    await client.setWorkflowState('w1', {});

    expect(mock.SetWorkflowState).toHaveBeenCalledWith(
      { workflow_id: 'w1', state_json: '{}', commit: false },
      expect.any(Function),
    );
  });

  it('propagates errors from getWorkflowState', async () => {
    const mock = mockGrpcClient();
    mock.GetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(new Error('workflow not found'), null),
    );

    const client = createClient(mock);
    await expect(client.getWorkflowState('unknown')).rejects.toThrow('workflow not found');
  });

  it('propagates errors from setWorkflowState', async () => {
    const mock = mockGrpcClient();
    mock.SetWorkflowState.mockImplementation((_req: object, cb: Function) =>
      cb(new Error('permission denied'), null),
    );

    const client = createClient(mock);
    await expect(client.setWorkflowState('w1', {})).rejects.toThrow('permission denied');
  });
});
