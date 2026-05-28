#!/usr/bin/env node
import { BrowserPool } from "./browser-pool";
import { BrowserMeshRuntime } from "./browsermesh-runtime";
import { RuntimeGrpcServer } from "./grpc/runtime-grpc-server";

function parseArgs(): { host: string; port: number } {
  const args = process.argv.slice(2);
  let host = process.env.HOST ?? "0.0.0.0";
  let port = parseInt(process.env.PORT ?? "50051", 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host" && i + 1 < args.length) {
      host = args[++i];
    } else if (args[i] === "--port" && i + 1 < args.length) {
      port = parseInt(args[++i], 10);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: browsermesh-runtime [--host <host>] [--port <port>]");
      process.exit(0);
    }
  }

  return { host, port };
}

async function main(): Promise<void> {
  const { host, port } = parseArgs();

  const pool = new BrowserPool();
  await pool.start();

  const runtime = new BrowserMeshRuntime({ host, port }, pool);

  const server = new RuntimeGrpcServer({ runtime, host, port });

  await server.start();
  console.error(`BrowserMesh runtime listening on ${host}:${port}`);

  const cleanup = async () => {
    await server.shutdown();
    await pool.shutdown();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
