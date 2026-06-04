import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowIR } from '@browsermesh/workflow';
import { validateWorkflowIR, WorkflowValidationError } from './validate.js';

export type ManifestEntry = {
  id: string;
  name?: string;
  file: string;
};

export type WorkflowManifest = {
  generatedAt: string;
  baseDir: string;
  workflows: ManifestEntry[];
};

export function loadWorkflowDir(dir: string): WorkflowIR[] {
  const entries: WorkflowIR[] = [];

  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    throw new WorkflowValidationError(
      `Cannot read workflow directory "${dir}": directory not found or inaccessible`,
    );
  }

  for (const file of files.sort()) {
    if (!file.endsWith('.ir.json')) continue;

    const fullPath = resolve(dir, file);
    try {
      if (!statSync(fullPath).isFile()) continue;
    } catch {
      continue;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const parsed = JSON.parse(content);
      const ir = validateWorkflowIR(parsed);
      entries.push(ir);
    } catch (err) {
      if (err instanceof WorkflowValidationError) throw err;
      throw new WorkflowValidationError(
        `Failed to load "${file}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return entries;
}

export function loadWorkflowManifest(manifestPath?: string): WorkflowIR[] {
  const resolvedPath = manifestPath ?? resolve(process.cwd(), 'dist', 'workflows-manifest.json');
  let manifest: WorkflowManifest;
  try {
    const content = readFileSync(resolvedPath, 'utf-8');
    manifest = JSON.parse(content) as WorkflowManifest;
  } catch (err) {
    throw new WorkflowValidationError(
      `Failed to read manifest "${resolvedPath}": ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!Array.isArray(manifest.workflows)) {
    throw new WorkflowValidationError('Manifest must contain a "workflows" array');
  }

  const baseDir = manifest.baseDir ? resolve(manifest.baseDir) : resolve(resolvedPath, '..');

  const results: WorkflowIR[] = [];

  for (const entry of manifest.workflows) {
    const irPath = resolve(baseDir, entry.file);
    try {
      const content = readFileSync(irPath, 'utf-8');
      const parsed = JSON.parse(content);
      const ir = validateWorkflowIR(parsed);
      results.push(ir);
    } catch (err) {
      if (err instanceof WorkflowValidationError) throw err;
      throw new WorkflowValidationError(
        `Failed to load manifest entry "${entry.id}": ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return results;
}
