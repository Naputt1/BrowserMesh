export class DebugStateStore {
  private store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  increment(key: string, by = 1): number {
    const current = (this.store.get(key) as number) ?? 0;
    const next = current + by;
    this.store.set(key, next);
    return next;
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.store);
  }

  clear(): void {
    this.store.clear();
  }
}
