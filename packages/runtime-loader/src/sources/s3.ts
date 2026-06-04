import { validateWorkflowIR, WorkflowValidationError } from '../validate.js';
import type { WorkflowIR } from '@browsermesh/workflow';
import type { S3Source } from './types.js';

export async function resolveFromS3(source: S3Source): Promise<WorkflowIR> {
  let S3Client: any;
  let GetObjectCommand: any;

  try {
    const s3 = await import('@aws-sdk/client-s3');
    S3Client = s3.S3Client;
    GetObjectCommand = s3.GetObjectCommand;
  } catch {
    throw new WorkflowValidationError(
      '@aws-sdk/client-s3 is not available. Install it to use S3 workflow sources. ' +
        'Run: npm install @aws-sdk/client-s3',
    );
  }

  const config: Record<string, unknown> = {
    region: source.region ?? 'us-east-1',
  };

  if (source.endpoint) config.endpoint = source.endpoint;
  if (source.accessKeyId) {
    config.credentials = {
      accessKeyId: source.accessKeyId,
      secretAccessKey: source.secretAccessKey ?? '',
      ...(source.sessionToken ? { sessionToken: source.sessionToken } : {}),
    };
  }

  const client = new S3Client(config);

  const command = new GetObjectCommand({
    Bucket: source.bucket,
    Key: source.key,
  });

  let response: any;
  try {
    response = await client.send(command);
  } catch (err) {
    throw new WorkflowValidationError(
      `Failed to fetch workflow from S3 (bucket="${source.bucket}", key="${source.key}"): ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!response.Body) {
    throw new WorkflowValidationError(
      `Empty response from S3 (bucket="${source.bucket}", key="${source.key}")`,
    );
  }

  const text = await response.Body.transformToString();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new WorkflowValidationError(
      `Invalid JSON in S3 object (bucket="${source.bucket}", key="${source.key}")`,
    );
  }

  return validateWorkflowIR(parsed);
}
