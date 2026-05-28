FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

# ── Dependencies ─────────────────────────────────────────────
FROM base AS deps
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/runtime/package.json apps/runtime/package.json
COPY packages/proto/package.json packages/proto/package.json
COPY packages/workflow/package.json packages/workflow/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

# ── Build ────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN pnpm exec turbo run build --filter=@browsermesh/runtime...

# ── Runtime ──────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app

# System fonts for canvas fingerprinting / anti-bot detection
RUN apt-get update && apt-get install -y \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    fonts-unifont \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-tlwg-loma-otf \
    && rm -rf /var/lib/apt/lists/*

# Copy node_modules (includes pnpm symlinks for workspace packages)
COPY --from=deps /app/node_modules /app/node_modules

# Copy workspace package.json files needed for node module resolution
COPY --from=build /app/packages/workflow/package.json /app/packages/workflow/package.json
COPY --from=build /app/apps/runtime/package.json /app/apps/runtime/package.json

# Copy built artifacts
COPY --from=build /app/packages/proto/browsermesh /app/packages/proto/browsermesh
COPY --from=build /app/packages/workflow/dist /app/packages/workflow/dist
COPY --from=build /app/apps/runtime/dist /app/apps/runtime/dist

# Install Playwright Chromium with system deps
RUN npx playwright install --with-deps chromium

EXPOSE 50051
CMD ["node", "apps/runtime/dist/cli.js"]
