import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";

export interface PersistentStateStore {
  load(workflowId: string): Promise<Record<string, unknown> | null>;
  save(workflowId: string, state: Record<string, unknown>): Promise<void>;
}

export class GlobalStateStore {
  private live = new Map<string, unknown>();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly stateDir: string;
  private readonly persistent: PersistentStateStore;
  private loaded = false;

  constructor(
    readonly workflowId: string,
    stateDir?: string,
    persistent?: PersistentStateStore,
  ) {
    this.stateDir = stateDir ?? join(process.cwd(), "state");
    this.persistent = persistent ?? new FilePersistentStateStore(this.stateDir);
  }

  async initialize(): Promise<void> {
    await mkdir(this.stateDir, { recursive: true }).catch(() => {});
    const saved = await this.persistent.load(this.workflowId);
    if (saved) {
      for (const [key, value] of Object.entries(saved)) {
        this.live.set(key, value);
      }
    }
    const backup = await this.loadBackup();
    if (backup) {
      for (const [key, value] of Object.entries(backup)) {
        if (!this.live.has(key)) {
          this.live.set(key, value);
        }
      }
    }
    this.loaded = true;
  }

  get<T = unknown>(key: string): T | undefined {
    return this.live.get(key) as T | undefined;
  }

  set(key: string, value: unknown): void {
    this.live.set(key, value);
    this.debouncedBackup();
  }

  increment(key: string, by = 1): number {
    const current = (this.live.get(key) as number) ?? 0;
    const next = current + by;
    this.live.set(key, next);
    this.debouncedBackup();
    return next;
  }

  delete(key: string): void {
    this.live.delete(key);
    this.debouncedBackup();
  }

  getAll(): Record<string, unknown> {
    return Object.fromEntries(this.live);
  }

  async commit(): Promise<void> {
    await this.persistent.save(this.workflowId, this.getAll());
  }

  private debouncedBackup(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.writeBackup().catch(() => {});
    }, 500);
  }

  private async writeBackup(): Promise<void> {
    const filePath = join(this.stateDir, `${this.workflowId}.json`);
    await mkdir(dirname(filePath), { recursive: true }).catch(() => {});
    await writeFile(filePath, JSON.stringify(this.getAll(), null, 2), "utf-8");
  }

  private async loadBackup(): Promise<Record<string, unknown> | null> {
    const filePath = join(this.stateDir, `${this.workflowId}.json`);
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  static async recover(workflowId: string, stateDir?: string): Promise<boolean> {
    const dir = stateDir ?? join(process.cwd(), "state");
    const filePath = join(dir, `${workflowId}.json`);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

export class FilePersistentStateStore implements PersistentStateStore {
  constructor(private readonly stateDir: string) {}

  async load(workflowId: string): Promise<Record<string, unknown> | null> {
    const filePath = join(this.stateDir, `${workflowId}.persist.json`);
    try {
      await access(filePath);
      const content = await readFile(filePath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async save(workflowId: string, state: Record<string, unknown>): Promise<void> {
    const filePath = join(this.stateDir, `${workflowId}.persist.json`);
    await mkdir(dirname(filePath), { recursive: true }).catch(() => {});
    await writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
  }
}
