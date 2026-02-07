# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /build

# XXX could copy dep graph first for better layer caching
# Copy repo
COPY . ./

# Seed corepack from the checked-in Yarn release
RUN ./scripts/ensure-corepack-yarn.sh /build

# Install just the necessary dependencies
# `focus` does not support immutability https://github.com/yarnpkg/berry/issues/1803
# We could use `yarn install --mode=skip-build --immutable` to get immutability but that
# hits up against the root .dockerignore excluding some packages which forces yarn.lock changes.
# We could use `yarn workspaces focus @aglocal/ymax-planner` but there is a ghost dependency
# of `@agoric/vats` on provisionPool.js in inter-protocol.
# So for now we just build everything and don't expect immutability.
# Keep cache in-project so hardlink-based installs can run on a single filesystem in Docker.
RUN --mount=type=cache,target=/build/.yarn/cache YARN_ENABLE_GLOBAL_CACHE=0 YARN_CACHE_FOLDER=/build/.yarn/cache yarn install --mode=skip-build

# Build the service and its dependencies
# XXX manual list of dependencies is brittle
# Cannot `npm run build` the repo because it assumes Git environment.
# This should work but we have sloppy package dependencies: yarn workspaces foreach --topological --recursive --from @aglocal/ymax-planner run build
RUN cd packages/cosmic-proto && yarn build
RUN cd packages/client-utils && yarn build
RUN cd services/ymax-planner && yarn build
# `yarn workspaces focus ... --production` builds better-sqlite3 bindings without triggering build 
# of dependencies such as xsnap.
RUN yarn workspaces focus @aglocal/ymax-planner --production
RUN cd packages/portfolio-contract && yarn build

# Production stage
FROM node:22-alpine AS production

# Metadata
LABEL org.opencontainers.image.title="ymax-planner" \
      org.opencontainers.image.description="Portfolio contract off-chain engine" \
      org.opencontainers.image.source="https://github.com/Agoric/agoric-sdk" \
      org.opencontainers.image.vendor="Agoric"

# Copy built application from builder stage
COPY --from=builder /build/services/ymax-planner/dist/entrypoint.js /app/entrypoint.js

# Copy better-sqlite3 bindings
# better-sqlite3 will not run without this bindings file
COPY --from=builder /build/node_modules/better-sqlite3/build/Release /app/Release

# Copy node_modules for better-sqlite3
#
# better-sqlite3 requires that a node_modules or packages.json file be present
# in order to find a root directory. since we use a compressed bundle, those
# folders arent present and must be manually added
RUN mkdir /app/node_modules
COPY --from=builder /build/node_modules/better-sqlite3 /app/node_modules/better-sqlite3

# Copy built highs.wasm file from builder stage
COPY --from=builder /build/node_modules/highs/build/highs.wasm /app/highs.wasm

# Prepare for running as a non-root user.
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
RUN mkdir -p /data/ymax-planner && \
    chown appuser:appgroup /data/ymax-planner

# Drop privileges.
USER appuser
ENV HOME=/data/ymax-planner
WORKDIR /data/ymax-planner

# Run the bundled single-file distribution
# Keep ENTRYPOINT overridable via `docker run ... -- <args>` if needed.
ENTRYPOINT [ "node", "/app/entrypoint.js" ]
