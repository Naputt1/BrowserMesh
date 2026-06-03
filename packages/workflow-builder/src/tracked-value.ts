export class TrackedValue<T = string> {
  readonly outputNodeId: string;

  constructor(
    public readonly raw: T,
    outputNodeId: string,
  ) {
    this.outputNodeId = outputNodeId;
  }

  toString(): string {
    return String(this.raw);
  }

  valueOf(): T {
    return this.raw;
  }
}
