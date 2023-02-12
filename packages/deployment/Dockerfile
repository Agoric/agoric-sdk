ARG TAG=latest
ARG REPO=agoric/agoric-sdk

# FIXME: Journalbeat compilation is currently broken, but non-essential.
# Removed from the build.
# FROM golang:1.18 AS go-build

# WORKDIR /usr/src/journalbeat
# RUN apt-get update -y && apt-get install -y libsystemd-dev
# RUN go get github.com/mheese/journalbeat

FROM $REPO:$TAG

RUN /usr/src/agoric-sdk/packages/deployment/scripts/install-deps.sh

# # Copy journalbeat for logging support
# COPY --from=go-build /go/bin/journalbeat /usr/local/bin/

WORKDIR /usr/src/agoric-sdk/packages/deployment
RUN ln -sf $PWD/bin/ag-setup-cosmos /usr/local/bin/ag-setup-cosmos

WORKDIR /data/chains

ENTRYPOINT [ "ag-setup-cosmos" ]
