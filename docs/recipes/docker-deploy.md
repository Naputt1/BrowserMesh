# Docker Deploy

Deploy the BrowserMesh runtime in Docker for production use.

## Docker Image

The project includes a multi-stage `Dockerfile` at the repository root:

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/apps/runtime/dist ./apps/runtime/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
EXPOSE 50051 50052
CMD ["node", "apps/runtime/dist/cli.js"]
```

## Build the Image

```sh
docker build -t browsermesh-runtime .
```

## Run the Container

```sh
docker run -d \
  --name browsermesh \
  -p 50051:50051 \
  -p 50052:50052 \
  -e BROWSERMESH_HEADLESS=true \
  -e BROWSERMESH_MAX_BROWSERS=4 \
  browsermesh-runtime
```

## Docker Compose

`docker-compose.yml`:

```yaml
version: '3.8'
services:
  runtime:
    build: .
    ports:
      - '50051:50051'
      - '50052:50052'
    environment:
      - BROWSERMESH_HEADLESS=true
      - BROWSERMESH_MAX_BROWSERS=4
      - BROWSERMESH_GRPC_PORT=50051
      - BROWSERMESH_REST_PORT=50052
    volumes:
      - ./state:/app/state
    restart: unless-stopped

  dashboard:
    build:
      context: .
      dockerfile: apps/dashboard/Dockerfile
    ports:
      - '3000:3000'
    environment:
      - RUNTIME_URL=http://runtime:50052
    depends_on:
      - runtime
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BROWSERMESH_GRPC_PORT` | `50051` | gRPC server port |
| `BROWSERMESH_REST_PORT` | `50052` | REST API port |
| `BROWSERMESH_MAX_BROWSERS` | `4` | Max concurrent browsers |
| `BROWSERMESH_HEADLESS` | `true` | Headless mode |
| `BROWSERMESH_BROWSER_DATA_DIR` | `./state/browsers` | Browser profile data |
| `BROWSERMESH_STATE_DIR` | `./state` | Runtime state directory |

## Kubernetes

For Kubernetes deployment, use the same image. Example deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: browsermesh-runtime
spec:
  replicas: 3
  selector:
    matchLabels:
      app: browsermesh-runtime
  template:
    metadata:
      labels:
        app: browsermesh-runtime
    spec:
      containers:
        - name: runtime
          image: browsermesh-runtime:latest
          ports:
            - containerPort: 50051
            - containerPort: 50052
          env:
            - name: BROWSERMESH_HEADLESS
              value: 'true'
          resources:
            requests:
              memory: '1Gi'
              cpu: '500m'
            limits:
              memory: '2Gi'
              cpu: '1000m'
---
apiVersion: v1
kind: Service
metadata:
  name: browsermesh-runtime
spec:
  ports:
    - name: grpc
      port: 50051
    - name: rest
      port: 50052
  selector:
    app: browsermesh-runtime
```

## Scaling

The runtime uses a stateless execution model, so replicas can scale horizontally. Browser instances are pooled per replica. Use a gRPC load balancer to distribute requests across replicas.
