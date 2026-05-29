import { copyFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const protoSrc = resolve(root, "../proto/browsermesh/v1/runtime.proto");
const protoDest = resolve(root, "dist/runtime.proto");

mkdirSync(dirname(protoDest), { recursive: true });
copyFileSync(protoSrc, protoDest);
