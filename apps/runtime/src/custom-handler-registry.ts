import type { CustomHandler } from "./interpreter/types.js";

export class CustomHandlerRegistry {
  private readonly handlers = new Map<string, CustomHandler>();

  register(name: string, handler: CustomHandler): void {
    this.handlers.set(name, handler);
  }

  get(name: string): CustomHandler | undefined {
    return this.handlers.get(name);
  }

  has(name: string): boolean {
    return this.handlers.has(name);
  }

  remove(name: string): boolean {
    return this.handlers.delete(name);
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }

  toMap(): ReadonlyMap<string, CustomHandler> {
    return new Map(this.handlers);
  }
}
