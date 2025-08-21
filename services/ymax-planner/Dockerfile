ARG TAG=latest
FROM ghcr.io/agoric/agoric-sdk:$TAG

RUN corepack enable

# Build the latest ymax-planner package.
COPY . /usr/src/agoric-sdk/packages/ymax-planner/
# refresh installation
RUN yarn install
RUN cd /usr/src/agoric-sdk/packages/ymax-planner && npm run build

# Prepare for running as a non-root user.
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
RUN mkdir -p /data/ymax-planner && \
    chown appuser:appgroup /data/ymax-planner

# Drop privileges.
USER appuser
ENV HOME=/data/ymax-planner
WORKDIR /data/ymax-planner

# Start the TS entrypoint directly with ts-blank-space
ENTRYPOINT [ "node", "/usr/src/agoric-sdk/services/ymax-planner/src/entrypoint.ts" ]
