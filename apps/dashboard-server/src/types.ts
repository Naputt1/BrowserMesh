import type { WorkflowIR } from '@browsermesh/sdk';

export type WorkflowType = 'visual' | 'compiled';

export type WorkflowRecord = {
  id: string;
  name: string;
  type: WorkflowType;
  workflow: WorkflowIR;
  source?: string;
  createdAt: string;
  updatedAt: string;
};
