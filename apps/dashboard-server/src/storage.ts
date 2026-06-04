import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  existsSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import type { WorkflowRecord } from './types.js';

const STATE_ROOT = resolve(process.cwd(), 'state', 'workflows');

function ensureDir(): void {
  mkdirSync(STATE_ROOT, { recursive: true });
}

function filePath(id: string): string {
  return join(STATE_ROOT, `${id}.json`);
}

export function listWorkflows(): WorkflowRecord[] {
  ensureDir();
  const files = readdirSync(STATE_ROOT).filter((f) => f.endsWith('.json'));
  const workflows: WorkflowRecord[] = [];
  for (const file of files) {
    try {
      const data = readFileSync(join(STATE_ROOT, file), 'utf-8');
      workflows.push(JSON.parse(data) as WorkflowRecord);
    } catch {
      // skip corrupted files
    }
  }
  workflows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return workflows;
}

export function getWorkflow(id: string): WorkflowRecord | null {
  const path = filePath(id);
  if (!existsSync(path)) return null;
  try {
    const data = readFileSync(path, 'utf-8');
    return JSON.parse(data) as WorkflowRecord;
  } catch {
    return null;
  }
}

export function saveWorkflow(record: WorkflowRecord): void {
  ensureDir();
  writeFileSync(filePath(record.id), JSON.stringify(record, null, 2), 'utf-8');
}

export function deleteWorkflow(id: string): boolean {
  const path = filePath(id);
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

export function isEmpty(): boolean {
  ensureDir();
  return readdirSync(STATE_ROOT).filter((f) => f.endsWith('.json')).length === 0;
}
