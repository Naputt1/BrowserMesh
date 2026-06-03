import type { WorkflowIR } from '@browsermesh/workflow';

export type S3Source = {
  readonly type: 's3';
  readonly bucket: string;
  readonly key: string;
  readonly region?: string;
  readonly endpoint?: string;
  readonly accessKeyId?: string;
  readonly secretAccessKey?: string;
  readonly sessionToken?: string;
};

export type UrlSource = {
  readonly type: 'url';
  readonly url: string;
  readonly headers?: Record<string, string>;
};

export type InlineSource = {
  readonly type: 'inline';
  readonly ir: WorkflowIR;
};

export type WorkflowSource =
  | WorkflowIR
  | S3Source
  | UrlSource
  | InlineSource
  | string;
