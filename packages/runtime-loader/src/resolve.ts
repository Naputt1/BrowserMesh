import type { WorkflowIR } from '@browsermesh/workflow';
import { validateWorkflowIR, WorkflowValidationError } from './validate.js';
import { resolveFromUrl } from './sources/url.js';
import { resolveFromS3 } from './sources/s3.js';
import type { WorkflowSource, S3Source, UrlSource, InlineSource } from './sources/types.js';

const URL_REGEX = /^https?:\/\//;

function isWorkflowIR(value: unknown): value is WorkflowIR {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'nodes' in value &&
    'edges' in value
  );
}

function isS3Source(value: unknown): value is S3Source {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 's3'
  );
}

function isUrlSource(value: unknown): value is UrlSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'url'
  );
}

function isInlineSource(value: unknown): value is InlineSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<string, unknown>).type === 'inline'
  );
}

export async function resolveWorkflow(source: WorkflowSource): Promise<WorkflowIR> {
  if (typeof source === 'string') {
    if (URL_REGEX.test(source)) {
      return resolveFromUrl(source);
    }

    if (source.endsWith('.json')) {
      try {
        const fs = await import('node:fs');
        const content = fs.readFileSync(source, 'utf-8');
        const parsed = JSON.parse(content);
        return validateWorkflowIR(parsed);
      } catch (err) {
        if (err instanceof WorkflowValidationError) throw err;
        throw new WorkflowValidationError(
          `Failed to load local file "${source}": ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    try {
      const parsed = JSON.parse(source);
      return validateWorkflowIR(parsed);
    } catch {
      throw new WorkflowValidationError(
        `Invalid workflow source string. Expected a URL, file path, or JSON string. Got: "${source.slice(0, 100)}"`,
      );
    }
  }

  if (isWorkflowIR(source)) {
    return validateWorkflowIR(source);
  }

  if (isS3Source(source)) {
    return resolveFromS3(source);
  }

  if (isUrlSource(source)) {
    return resolveFromUrl(source.url, source.headers);
  }

  if (isInlineSource(source)) {
    return validateWorkflowIR(source.ir);
  }

  throw new WorkflowValidationError(
    `Unknown workflow source type: ${JSON.stringify(source)}`,
  );
}
