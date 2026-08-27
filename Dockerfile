# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:24.19.0-bookworm-slim

# ---- base: pnpm + lockfile-only layer for cache reuse ---------------------
FROM ${NODE_IMAGE} AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# ---- deps: full install (incl. devDependencies) needed to run the build --
FROM base AS deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

# ---- prod-deps: production-only install ----------------------------------
# Branches off `base`, not `deps` — under BuildKit this runs concurrently
# with the deps -> build chain below since neither depends on the other.
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store

# ---- build: compile the SvelteKit app -------------------------------------
FROM deps AS build
COPY . .
RUN pnpm run build

# ---- runtime: minimal final image -----------------------------------------
FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home /app app

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

RUN chown -R app:app /app
USER app

EXPOSE 3000
CMD ["node", "build/index.js"]
