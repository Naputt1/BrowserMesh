import { loadWorkflowManifest } from '@browsermesh/runtime-loader';
import type { WorkflowIR } from '@browsermesh/workflow';

export function listCompiledWorkflows(): WorkflowIR[] {
  try {
    return loadWorkflowManifest();
  } catch {
    return [];
  }
}
