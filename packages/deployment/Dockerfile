ARG TAG=latest
ARG REPO=agoric/agoric-sdk
ARG REGISTRY=ghcr.io

FROM $REGISTRY/$REPO:$TAG

COPY ./scripts/install-deps.sh /usr/src/agoric-sdk/packages/deployment/scripts/
RUN /usr/src/agoric-sdk/packages/deployment/scripts/install-deps.sh

WORKDIR /usr/src/agoric-sdk/packages/deployment
COPY . .
RUN ln -sf $PWD/bin/ag-setup-cosmos /usr/local/bin/ag-setup-cosmos

WORKDIR /data/chains

ENTRYPOINT [ "ag-setup-cosmos" ]
