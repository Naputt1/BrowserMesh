import { validateWorkflowIR, WorkflowValidationError } from '../validate.js';
import type { WorkflowIR } from '@browsermesh/workflow';

export async function resolveFromUrl(
  url: string,
  headers?: Record<string, string>,
): Promise<WorkflowIR> {
  if (typeof globalThis.fetch !== 'function') {
    throw new WorkflowValidationError(
      'fetch is not available in this environment. Node.js 18+ is required for URL workflow sources.',
    );
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    throw new WorkflowValidationError(
      `Failed to fetch workflow from ${url}: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('json') && !contentType.includes('text')) {
    throw new WorkflowValidationError(`Expected JSON response from ${url}, got ${contentType}`);
  }

  const text = await response.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WorkflowValidationError(`Invalid JSON response from ${url}: ${text.slice(0, 200)}`);
  }

  return validateWorkflowIR(parsed);
}
