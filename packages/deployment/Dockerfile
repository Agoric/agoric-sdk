ARG TAG=latest
ARG REPO=agoric/agoric-sdk
ARG REGISTRY=ghcr.io

FROM $REGISTRY/$REPO:$TAG

WORKDIR /usr/src/agoric-sdk/packages/deployment

COPY ./scripts/install-deps.sh scripts/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    ./scripts/install-deps.sh

COPY . .
RUN ln -sf $PWD/bin/ag-setup-cosmos /usr/local/bin/ag-setup-cosmos

WORKDIR /data/chains

ENTRYPOINT ["ag-setup-cosmos"]
