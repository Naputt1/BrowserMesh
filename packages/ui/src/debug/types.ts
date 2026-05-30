import type { WorkflowNode, GlobalSettings, WorkflowEvent } from '@browsermesh/workflow';
import type { CDPClient } from './cdp-client';

export type DebugSessionInfo = {
  targetId: string;
  sessionId: string;
};

export interface DebugExecutionContext {
  readonly taskId: string;
  readonly cdp: CDPClient;
  readonly defaultSessionId?: string;
  readonly pageSessions: Map<string, DebugSessionInfo>;
  readonly loopIndex?: number;
  readonly globalSettings?: GlobalSettings;
  controlSignal?: { value: 'break' | 'continue' | undefined };
  setOutput(pin: string, value: unknown): void;
  getSession(pageKey?: string): string | undefined;
}

export type DebugNodeHandler = (
  node: WorkflowNode,
  context: DebugExecutionContext,
  inputs: Record<string, unknown>,
  executeSubgraph?: (
    startHandle: string,
    contextOverride?: Partial<DebugExecutionContext>,
  ) => AsyncGenerator<WorkflowEvent>,
) => AsyncGenerator<WorkflowEvent>;
