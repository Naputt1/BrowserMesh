import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { join, dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkflowIR } from '@browsermesh/workflow';

export type CompiledWorkflow = {
  exportName: string;
  ir: WorkflowIR;
  source: string;
  fullMatchStart: number;
  fullMatchEnd: number;
};

export type ExtractResult = {
  exportName: string;
  builderCode: string;
  fullMatchStart: number;
  fullMatchEnd: number;
};

const _dirname = dirname(fileURLToPath(import.meta.url));
const WRAPPER_DIR = join(_dirname, '..', '.browsermesh-wrappers');

function findMatchingParen(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const CALL_RE =
  /(?:(?:export\s+)?(?:default\s+)?)?(?:const\s+(\w+)\s*=\s*)?createWorkflow\s*(?:<[^>]+>)?\s*\(/;

export function extractWorkflow(source: string): ExtractResult | null {
  const match = CALL_RE.exec(source);
  if (!match) return null;

  const callOpenIndex = match.index + match[0].length - 1;
  const callCloseIndex = findMatchingParen(source, callOpenIndex);
  if (callCloseIndex === -1) return null;

  const argStart = callOpenIndex + 1;
  const argRaw = source.slice(argStart, callCloseIndex).trim();

  const funcMatch = argRaw.match(/^(?:\((\w+)\)|(\w+))\s*=>\s*{/);
  if (!funcMatch) return null;

  const bodyStart = argRaw.indexOf('{');
  if (bodyStart === -1) return null;

  let braceDepth = 0;
  let bodyEnd = -1;
  for (let i = bodyStart; i < argRaw.length; i++) {
    if (argRaw[i] === '{') braceDepth++;
    else if (argRaw[i] === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        bodyEnd = i;
        break;
      }
    }
  }
  if (bodyEnd === -1) return null;

  const paramName = funcMatch[1] ?? funcMatch[2] ?? 'wf';
  const bodyCode = argRaw.slice(bodyStart, bodyEnd + 1);

  const exportName = match[1] ?? 'workflow';
  const startIdx = match.index;
  const endIdx = callCloseIndex + 1;

  return {
    exportName,
    builderCode: `(${paramName}) => ${bodyCode}`,
    fullMatchStart: startIdx,
    fullMatchEnd: endIdx,
  };
}

function stripTypeAnnotations(code: string): string {
  let result = code;
  result = result.replace(
    /:\s*(string|number|boolean|void|null|undefined|any|never|unknown)\b/g,
    '',
  );
  result = result.replace(/:\s*\{\s*[^}]+\s*\}/g, '');
  result = result.replace(/:\s*readonly\s*/g, '');
  result = result.replace(
    /(const|let|var)\s+\w+\s*:\s*\w+(?:<[^>]+>)?(?:\s*=\s*)/g,
    (_, keyword) => `${keyword} `,
  );
  result = result.replace(/\bas\s+\w+(?:<[^>]+>)?\s*/g, '');
  return result;
}

export async function compileSource(
  source: string,
  filename: string,
): Promise<CompiledWorkflow | null> {
  const extracted = extractWorkflow(source);
  if (!extracted) return null;

  const strippedBody = stripTypeAnnotations(extracted.builderCode);

  await mkdir(WRAPPER_DIR, { recursive: true });

  const wrapperId = `wrapper-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const wrapperPath = join(WRAPPER_DIR, `${wrapperId}.mjs`);

  const wrapperCode = [
    `import { createWorkflow } from '@browsermesh/workflow-builder';`,
    `const __wf__ = createWorkflow(${strippedBody});`,
    `const __ir__ = JSON.parse(JSON.stringify(__wf__.getIR()));`,
    `export { __ir__ };`,
    `export const exportName = ${JSON.stringify(extracted.exportName)};`,
  ].join('\n');

  try {
    await writeFile(wrapperPath, wrapperCode, 'utf-8');
    const imp = await import(wrapperPath);
    const ir: WorkflowIR = (imp as any).__ir__;
    const exportName: string = (imp as any).exportName;

    return {
      exportName,
      ir,
      source,
      fullMatchStart: extracted.fullMatchStart,
      fullMatchEnd: extracted.fullMatchEnd,
    };
  } finally {
    await rm(wrapperPath, { force: true }).catch(() => {});
  }
}

export function rewriteSource(
  source: string,
  compiled: CompiledWorkflow,
  irRelativePath: string,
): string {
  const importPath = JSON.stringify(
    irRelativePath.startsWith('.') ? irRelativePath : `./${irRelativePath}`,
  );

  const replacement = [
    `import __ir from ${importPath};`,
    `import { createWorkflowLoader } from '@browsermesh/workflow-builder';`,
    ``,
    `export const ${compiled.exportName} = createWorkflowLoader(__ir)`,
  ].join('\n');

  return (
    source.slice(0, compiled.fullMatchStart) + replacement + source.slice(compiled.fullMatchEnd)
  );
}

export function getIrFilename(sourcePath: string): string {
  const base = basename(sourcePath, extname(sourcePath));
  return `${base}.ir.json`;
}

export async function compileFile(filepath: string, outDir?: string): Promise<CompiledWorkflow> {
  const source = readFileSync(filepath, 'utf-8');
  const compiled = await compileSource(source, filepath);
  if (!compiled) {
    throw new Error(`No createWorkflow call found in ${filepath}`);
  }

  const irFilename = getIrFilename(filepath);
  const targetDir = outDir ?? dirname(filepath);
  mkdirSync(targetDir, { recursive: true });
  writeFileSync(join(targetDir, irFilename), JSON.stringify(compiled.ir, null, 2), 'utf-8');

  return compiled;
}

export async function cleanupWrappers(): Promise<void> {
  try {
    const files = await readdir(WRAPPER_DIR);
    for (const f of files) {
      if (f.endsWith('.mjs')) {
        await rm(join(WRAPPER_DIR, f), { force: true }).catch(() => {});
      }
    }
  } catch {}
}
