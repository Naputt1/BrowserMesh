import type { WorkflowEvent } from "@browsermesh/workflow";

export interface Locator {
  click(): Promise<void>;
  fill(value: string): Promise<void>;
  textContent(): Promise<string | null>;
  getAttribute(name: string): Promise<string | null>;
  inputValue(): Promise<string>;
  isVisible(): Promise<boolean>;
  waitFor(options?: { state?: string; timeout?: number }): Promise<void>;
  all(): Promise<Locator[]>;
  first(): Locator;
  nth(index: number): Locator;
  locator(selector: string): Locator;
}

export interface Page {
  goto(url: string, options?: { waitUntil?: string }): Promise<void>;
  locator(selector: string): Locator;
  evaluate(fn: string, ...args: unknown[]): Promise<unknown>;
  close(): Promise<void>;
  url(): string;
}

export interface ExecutionContext {
  readonly taskId: string;
  readonly signal: AbortSignal;
  readonly page: Page;
  readonly currentElement?: Locator;
  readonly getCustomHandler: (name: string) => CustomHandler | undefined;
}

export type CustomHandler = (
  config: Record<string, unknown>,
  context: ExecutionContext,
) => Promise<unknown>;

export type NodeHandler = (
  node: { id: string; type: string; config?: Record<string, unknown> },
  context: ExecutionContext,
  executeChildren: (
    nodeIds: string[],
    contextOverride?: Partial<ExecutionContext>,
  ) => AsyncGenerator<WorkflowEvent>,
) => AsyncGenerator<WorkflowEvent>;
