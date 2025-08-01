ARG TAG=latest
FROM ghcr.io/agoric/agoric-sdk:$TAG

RUN corepack enable

# Build the latest portfolio-planner package.
COPY . /usr/src/agoric-sdk/packages/portfolio-planner/
RUN cd /usr/src/agoric-sdk/packages/portfolio-planner && \
    yarn && npm run build

# Prepare for running as a non-root user.
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
RUN mkdir -p /data/portfolio-planner && \
    chown appuser:appgroup /data/portfolio-planner

# Drop privileges.
USER appuser
ENV HOME=/data/portfolio-planner
WORKDIR /data/portfolio-planner

ENTRYPOINT [ "node", "/usr/src/agoric-sdk/packages/portfolio-planner/src/entrypoint.js" ]
