import { readFileSync, writeFileSync } from 'node:fs';
import { compileSource } from '@browsermesh/compiler';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const source = readFileSync(join(__dirname, 'workflow.ts'), 'utf-8');

const result = await compileSource(source, 'workflow.ts');

if (result) {
  const irPath = join(__dirname, 'compiled.ir.json');
  writeFileSync(irPath, JSON.stringify(result.ir, null, 2));
  console.log(`Compiled ${result.exportName} → ${irPath}`);
  console.log(`  Nodes: ${result.ir.nodes.length}`);
  console.log(`  Edges: ${result.ir.edges.length}`);
  console.log(`  Export: ${result.exportName}`);

  const rewritten = `import __ir from './compiled.ir.json';\nimport { createWorkflowLoader } from '@browsermesh/sdk';\n\nexport const ${result.exportName} = createWorkflowLoader(__ir);\n`;
  const outPath = join(__dirname, 'output.mjs');
  writeFileSync(outPath, rewritten);
  console.log(`Rewritten output → ${outPath}`);
} else {
  console.log('No createWorkflow call found');
}
