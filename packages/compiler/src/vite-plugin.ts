import type { Plugin, ResolvedConfig } from 'vite';
import { resolve, relative, dirname } from 'node:path';
import { writeFileSync, mkdirSync } from 'node:fs';
import { compileSource, extractWorkflow, getIrFilename, rewriteSource, cleanupWrappers } from './compiler.js';

export type BrowserMeshCompilerOptions = {
  include?: string[];
  exclude?: string[];
  outDir?: string;
};

export function browsermesh(options?: BrowserMeshCompilerOptions): Plugin {
  const include = options?.include ?? ['**/*.ts'];
  const exclude = options?.exclude ?? ['node_modules', 'dist'];

  let config: ResolvedConfig;

  return {
    name: '@browsermesh/compiler',

    configResolved(resolved) {
      config = resolved;
    },

    buildEnd() {
      cleanupWrappers().catch(() => {});
    },

    async transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.mts')) return;
      if (exclude.some((p) => id.includes(p))) return;

      const extracted = extractWorkflow(code);
      if (!extracted) return;

      const compiled = await compileSource(code, id);
      if (!compiled) return;

      const irFilename = getIrFilename(id);
      const targetDir = options?.outDir
        ? resolve(config.root, options.outDir)
        : dirname(id);

      mkdirSync(targetDir, { recursive: true });

      const irPath = resolve(targetDir, irFilename);
      writeFileSync(irPath, JSON.stringify(compiled.ir, null, 2), 'utf-8');

      const relIrPath = relative(dirname(id), irPath);
      const rewritten = rewriteSource(code, compiled, relIrPath);

      return {
        code: rewritten,
        map: null,
      };
    },
  };
}
