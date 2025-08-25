# Build stage
FROM node:22-alpine AS builder

# Enable corepack
RUN --mount=type=cache,target=/root/.cache/corepack corepack enable

# Set working directory
WORKDIR /build

# XXX could copy dep graph first for better layer caching
# Copy repo
COPY . ./

# Install just the necessary dependencies
# `focus` does not support immutability https://github.com/yarnpkg/berry/issues/1803
# We could use `yarn install --mode=skip-build --immutable` to get immutability but that
# hits up against the root .dockerignore excluding some packages which forces yarn.lock changes.
# `yarn config` shows `enableGlobalCache: true` and `cacheFolder: '/root/.yarn/berry/cache'`
RUN --mount=type=cache,target=/root/.yarn/berry/cache yarn workspaces focus --production @aglocal/ymax-planner

# Build the service and its dependencies
# XXX cannot `npm run build` the repo because it assumes Git environment
RUN yarn workspaces foreach --topological --recursive --from ymax-planner-service run build

# Production stage
FROM node:22-alpine AS production

# Metadata
LABEL org.opencontainers.image.title="ymax-planner" \
      org.opencontainers.image.description="Portfolio contract off-chain engine" \
      org.opencontainers.image.source="https://github.com/Agoric/agoric-sdk" \
      org.opencontainers.image.vendor="Agoric"

# Copy built application from builder stage
COPY --from=builder /build/services/ymax-planner/dist/entrypoint.js /app/entrypoint.js

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
