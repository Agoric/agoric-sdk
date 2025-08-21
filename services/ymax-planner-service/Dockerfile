ARG TAG=latest
FROM ghcr.io/agoric/agoric-sdk:$TAG

# Metadata
LABEL org.opencontainers.image.title="ymax-planner-service" \
      org.opencontainers.image.description="Portfolio contract off-chain engine" \
      org.opencontainers.image.source="https://github.com/Agoric/agoric-sdk" \
      org.opencontainers.image.vendor="Agoric"

# Ensure Yarn via Corepack and perform deterministic installs at repo root.
WORKDIR /usr/src/agoric-sdk
RUN corepack enable

# Copy checked out sources into the workspace path inside the base image.
COPY . /usr/src/agoric-sdk/services/ymax-planner-service/

# Install deps according to lockfile
# Use a single layer and explicit working directories.
RUN yarn install --immutable

# Prepare non-root execution and runtime home.
RUN addgroup --system appgroup && \
    adduser --system --ingroup appgroup appuser && \
    mkdir -p /data/ymax-planner && \
    chown -R appuser:appgroup /data/ymax-planner

# Runtime configuration
ENV HOME=/data/ymax-planner \
    NODE_ENV=production
WORKDIR /data/ymax-planner
USER appuser:appgroup

# (Optional) HEALTHCHECK if your app exposes /healthz
# HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
#   CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Start the TS entrypoint directly with ts-blank-space
ENTRYPOINT ["node", "services/ymax-planner-service/src/entrypoint.ts"]
