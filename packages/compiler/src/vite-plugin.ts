import type { Plugin, ResolvedConfig, UserConfig } from 'vite';
import { resolve, relative, dirname } from 'node:path';
import { readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { compileSource, extractWorkflow, getIrFilename, cleanupWrappers } from './compiler.js';

export type BrowserMeshCompilerOptions = {
  include?: string[];
  exclude?: string[];
  outDir?: string;
  manifestFile?: string;
};

function scanFiles(dir: string, recursive: boolean): string[] {
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir)) {
      const fullPath = resolve(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        if (recursive) results.push(...scanFiles(fullPath, true));
      } else if (entry.endsWith('.ts') || entry.endsWith('.mts')) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

function resolveEntries(root: string, patterns: string[]): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const pattern of patterns) {
    const normalized = pattern.replace(/\\/g, '/');
    const isRecursive = normalized.includes('**');
    const globIndex = normalized.search(/[\*\?]/);
    let baseDir: string;
    if (globIndex >= 0) {
      const lastSep = normalized.lastIndexOf('/', globIndex);
      baseDir = lastSep >= 0 ? normalized.slice(0, lastSep) : '.';
    } else {
      baseDir = dirname(normalized);
    }
    const fullBase = resolve(root, baseDir === '.' ? '' : baseDir);
    const files = scanFiles(fullBase, isRecursive);
    for (const f of files) {
      const name = relative(fullBase, f).replace(/\.(ts|mts)$/, '');
      entries[`__bm_${name.replace(/[^a-zA-Z0-9_\-/]/g, '_')}`] = f;
    }
  }
  return entries;
}

export function browsermesh(options?: BrowserMeshCompilerOptions): Plugin {
  const include = options?.include ?? ['**/*.ts'];
  const exclude = options?.exclude ?? ['node_modules', 'dist'];
  const manifestFile = options?.manifestFile;
  let config: ResolvedConfig;
  const compiledEntries: Array<{
    id: string;
    name?: string;
    file: string;
    stableId: string;
    targetDir: string;
  }> = [];

  return {
    name: '@browsermesh/compiler',

    configResolved(resolved) {
      config = resolved;
    },

    config(userConfig: UserConfig) {
      const root = resolve(userConfig.root ?? process.cwd());
      const entries = resolveEntries(root, include);
      if (Object.keys(entries).length === 0) return;

      const existingInput = (userConfig.build as any)?.rollupOptions?.input ?? {};
      const buildInput =
        typeof existingInput === 'object' && !Array.isArray(existingInput) ? existingInput : {};

      return {
        build: {
          ...userConfig.build,
          rollupOptions: {
            ...(userConfig.build as any)?.rollupOptions,
            input: { ...buildInput, ...entries },
          },
        },
      };
    },

    buildEnd() {
      cleanupWrappers().catch(() => {});

      if (compiledEntries.length === 0) return;

      // group entries by targetDir
      const byDir = new Map<string, typeof compiledEntries>();
      for (const entry of compiledEntries) {
        const list = byDir.get(entry.targetDir) ?? [];
        list.push(entry);
        byDir.set(entry.targetDir, list);
      }

      const manifestName = manifestFile ?? 'workflows-manifest.json';
      for (const [targetDir, entries] of byDir) {
        const manifest = {
          generatedAt: new Date().toISOString(),
          baseDir: targetDir,
          workflows: entries.map(({ stableId, name, file }) => ({
            id: stableId,
            name,
            file,
          })),
          totalCount: entries.length,
        };

        const manifestPath = resolve(targetDir, '..', manifestName);
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
      }
    },

    async transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.mts')) return;
      if (exclude.some((p) => id.includes(p))) return;

      const extracted = extractWorkflow(code);
      if (!extracted) return;

      const compiled = await compileSource(code, id);
      if (!compiled) return;

      const irFilename = getIrFilename(id);
      const irName = irFilename.replace(/\.ir\.json$/, '');
      let targetDir: string;
      if (options?.outDir) {
        targetDir = resolve(config.root, options.outDir);
      } else {
        const relFromRoot = relative(config.root, dirname(id));
        const relPath = relFromRoot.startsWith('src/') ? relFromRoot.slice(4) : relFromRoot;
        targetDir = resolve(config.root, 'dist', relPath);
      }

      mkdirSync(targetDir, { recursive: true });

      const irPath = resolve(targetDir, irFilename);
      writeFileSync(irPath, JSON.stringify(compiled.ir, null, 2), 'utf-8');

      compiledEntries.push({
        id: compiled.ir.id,
        name: compiled.ir.name,
        file: irFilename,
        stableId: irName,
        targetDir,
      });
    },
  };
}
