ARG TAG=latest
ARG REGISTRY=ghcr.io
FROM $REGISTRY/agoric/agoric-sdk:$TAG

# The selected SDK tag may predate the CVE-2026-98432 mitigation. A patched
# host kernel is still required.
ENV GODEBUG="${GODEBUG:-},multipathtcp=0"

WORKDIR /data/solo

EXPOSE 8000
ENTRYPOINT [ "ag-solo", "--webhost=0.0.0.0", "--webport=8000" ]
