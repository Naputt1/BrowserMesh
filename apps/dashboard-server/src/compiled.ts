import { loadWorkflowManifest } from '@browsermesh/sdk/node';
import type { WorkflowIR } from '@browsermesh/sdk';

export function listCompiledWorkflows(): WorkflowIR[] {
  try {
    return loadWorkflowManifest();
  } catch {
    return [];
  }
}
