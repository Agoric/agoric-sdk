ARG TAG=latest
ARG REPO=agoric/agoric-sdk
ARG REGISTRY=ghcr.io

FROM $REGISTRY/$REPO:$TAG

# The selected SDK tag may predate the CVE-2026-98432 mitigation. This only
# reduces exposure; the host kernel still needs to be patched and rebooted.
ENV GODEBUG="${GODEBUG:-},multipathtcp=0"

WORKDIR /usr/src/agoric-sdk/packages/deployment

COPY ./scripts/install-deps.sh scripts/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    ./scripts/install-deps.sh

COPY . .
RUN ln -sf $PWD/bin/ag-setup-cosmos /usr/local/bin/ag-setup-cosmos

WORKDIR /data/chains

ENTRYPOINT ["ag-setup-cosmos"]
