import { access, mkdir, readFile, writeFile } from 'node:fs/promises';

const protoPath = new URL('../browsermesh/v1/runtime.proto', import.meta.url);

await access(protoPath);

const source = await readFile(protoPath, 'utf8');
const required = [
  'service BrowserMeshRuntime',
  'rpc ExecuteWorkflow',
  'rpc CancelTask',
  'rpc PauseTask',
  'rpc ResumeTask',
  'rpc GetTaskStatus',
  'rpc ListRunningTasks',
  'message WorkflowEvent',
];

for (const token of required) {
  if (!source.includes(token)) {
    throw new Error(`Missing proto token: ${token}`);
  }
}

const distDir = new URL('../dist/', import.meta.url);
await mkdir(distDir, { recursive: true });
await writeFile(new URL('.validated', distDir), 'ok\n');
