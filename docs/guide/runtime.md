# Runtime

The runtime is a standalone Node.js server that executes compiled workflow graphs using Playwright. It exposes both gRPC and REST APIs.

## Starting the Runtime

```sh
cd apps/runtime
pnpm dev    # development mode with hot reload
pnpm start  # production mode (requires build)
```

## CLI Options

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--grpc-port` | `BROWSERMESH_GRPC_PORT` | `50051` | gRPC server port |
| `--rest-port` | `BROWSERMESH_REST_PORT` | `50052` | REST API port |
| `--max-browsers` | `BROWSERMESH_MAX_BROWSERS` | `4` | Maximum concurrent browser instances |
| `--browser-data-dir` | `BROWSERMESH_BROWSER_DATA_DIR` | `./state/browsers` | Browser profile data directory |
| `--state-dir` | `BROWSERMESH_STATE_DIR` | `./state` | Runtime state persistence directory |
| `--headless` | `BROWSERMESH_HEADLESS` | `true` | Run browsers in headless mode |

## Architecture

```
┌─────────────┐    gRPC/REST     ┌──────────────────┐
│   Client    │ ──────────────►  │  Runtime Server  │
│  (SDK/CLI)  │ ◄────────────── │                  │
└─────────────┘     events       │  ┌────────────┐  │
                                 │  │ BrowserPool│  │
                                 │  └────────────┘  │
                                 │  ┌────────────┐  │
                                 │  │ Interpreter │  │
                                 │  └────────────┘  │
                                 │  ┌────────────┐  │
                                 │  │Task Registry│ │
                                 │  └────────────┘  │
                                 └──────────────────┘
```

### Internal Components

| Component | Role |
|-----------|------|
| **BrowserPool** | Manages shared Chromium instances via CloakBrowser (stealth browser), isolates contexts per task, recycles sessions |
| **WorkflowInterpreter** | Walks the workflow graph, dispatches nodes to registered handlers, yields streaming events |
| **BrowserMeshRuntime** | Top-level orchestrator: acquires pages, creates interpreters, manages task lifecycle (start/cancel/pause/resume/state) |
| **TaskRegistry** | Tracks active tasks and their status |
| **PageManager** | Manages multiple pages/tabs within a browser context |
| **GlobalStateStore** | Optional cross-task state persistence |
| **CustomHandlerRegistry** | Register custom node handlers for application-specific logic |

## gRPC API

The gRPC server implements the `BrowserMeshRuntime` service (defined in `packages/proto`):

| RPC | Description |
|-----|-------------|
| `ExecuteWorkflow` | Execute a workflow, returns a stream of events |
| `CancelTask` | Cancel a running task |
| `PauseTask` | Pause a running task |
| `ResumeTask` | Resume a paused task |
| `GetTaskStatus` | Get current task status |
| `ListRunningTasks` | List all running tasks |
| `GetWorkflowState` | Get persisted workflow state |
| `SetWorkflowState` | Set persisted workflow state |
| `RecoverWorkflowState` | Recover workflow state after restart |

See the [gRPC API Reference](/reference/grpc-api) for full message definitions.

## REST API

The REST server provides the same operations over HTTP:

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workflow/execute` | Execute a workflow |
| `POST` | `/task/cancel` | Cancel a task |
| `POST` | `/task/pause` | Pause a task |
| `POST` | `/task/resume` | Resume a task |
| `GET` | `/task/status/:taskId` | Get task status |
| `GET` | `/tasks` | List running tasks |

## Browser Pooling

The runtime maintains a pool of shared Chromium instances:

- **Shared instances** — browsers are reused across tasks to reduce startup overhead
- **Isolated contexts** — each task gets its own browser context (separate cookies, storage, sessions)
- **Context recycling** — contexts are cleaned and returned to the pool after use
- **Stealth mode** — uses CloakBrowser to avoid detection by anti-bot systems
- **Proxy support** — per-task proxy configuration via `BrowserOptions`

## Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install && pnpm build
EXPOSE 50051 50052
CMD ["node", "apps/runtime/dist/cli.js"]
```

For a complete deployment guide, see the [Docker Deploy recipe](/recipes/docker-deploy).

## Human-Like Timing

The runtime can simulate human behavior through `TimingControls`:

- **Typing speed** — simulate human typing with variable inter-key delays
- **Mouse movement** — move the mouse along natural curved paths
- **Scroll behavior** — scroll with acceleration and deceleration
- **Request jitter** — add random delays to network requests
- **Idle pauses** — insert random idle periods to appear more human
