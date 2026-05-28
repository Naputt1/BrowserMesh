#!/usr/bin/env node
import { BrowserPool } from "./browser-pool.js";
import { BrowserMeshRuntime } from "./browsermesh-runtime.js";
import { RuntimeGrpcServer } from "./grpc/runtime-grpc-server.js";
import { RuntimeRestServer } from "./rest/runtime-rest-server.js";

type Args = {
  host: string;
  grpcPort: number;
  restPort: number;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let host = process.env.HOST ?? "0.0.0.0";
  let grpcPort = parseInt(process.env.GRPC_PORT ?? "50051", 10);
  let restPort = parseInt(process.env.REST_PORT ?? "50052", 10);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--host" && i + 1 < args.length) {
      host = args[++i];
    } else if (args[i] === "--grpc-port" && i + 1 < args.length) {
      grpcPort = parseInt(args[++i], 10);
    } else if (args[i] === "--rest-port" && i + 1 < args.length) {
      restPort = parseInt(args[++i], 10);
    } else if (args[i] === "--help" || args[i] === "-h") {
      console.log("Usage: browsermesh-runtime [options]");
      console.log("  --host <host>         Host to bind to (default: 0.0.0.0)");
      console.log("  --grpc-port <port>    gRPC port (default: 50051)");
      console.log("  --rest-port <port>    REST port (default: 50052)");
      process.exit(0);
    }
  }

  return { host, grpcPort, restPort };
}

async function main(): Promise<void> {
  const { host, grpcPort, restPort } = parseArgs();

  const pool = new BrowserPool();
  await pool.start();

  const runtime = new BrowserMeshRuntime({ host, port: grpcPort }, pool);

  const grpcServer = new RuntimeGrpcServer({ runtime, host, port: grpcPort });
  const restServer = new RuntimeRestServer(runtime);

  await grpcServer.start();
  await restServer.start(host, restPort);

  console.error(`gRPC server listening on ${host}:${grpcPort}`);
  console.error(`REST server listening on ${host}:${restPort}`);

  const cleanup = async () => {
    await grpcServer.shutdown();
    await restServer.shutdown();
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
