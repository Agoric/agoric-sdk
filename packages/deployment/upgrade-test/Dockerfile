ARG DEST_IMAGE=ghcr.io/agoric/agoric-sdk:latest
# on agoric-uprade-7-2, with upgrade to agoric-upgrade-8
FROM ghcr.io/agoric/ag0:agoric-upgrade-7-2 as agoric-upgrade-7-2
ENV UPGRADE_TO=agorictest-upgrade-8
ENV THIS_NAME=agoric-upgrade-7-2

RUN mkdir -p /usr/src/agoric-sdk
WORKDIR /usr/src/agoric-sdk/
COPY upgrade-test-scripts ./upgrade-test-scripts
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_ag0.sh

ARG DEST_IMAGE
## this is agoric-upgrade-8 aka pismoA
FROM ghcr.io/agoric/agoric-sdk:29 as agoric-upgrade-8
WORKDIR /usr/src/agoric-sdk/
ENV THIS_NAME=agoric-upgrade-8

COPY upgrade-test-scripts ./upgrade-test-scripts
COPY --from=agoric-upgrade-7-2 /usr/src/agoric-sdk/netstate netstate
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
#this is agoric-upgrade-8-1 aka pismoB
FROM ghcr.io/agoric/agoric-sdk:30 as agoric-upgrade-8-1
ENV THIS_NAME=agoric-upgrade-8-1
ENV UPGRADE_TO=agorictest-upgrade-9

WORKDIR /usr/src/agoric-sdk/
COPY upgrade-test-scripts ./upgrade-test-scripts
COPY --from=agoric-upgrade-8 /usr/src/agoric-sdk/netstate netstate
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
#this is agoric-upgrade-9 / pismoC
FROM ghcr.io/agoric/agoric-sdk:31 as agoric-upgrade-9
ENV THIS_NAME=agoric-upgrade-9
ENV UPGRADE_TO=agorictest-upgrade-10

WORKDIR /usr/src/agoric-sdk/
COPY upgrade-test-scripts ./upgrade-test-scripts
COPY --from=agoric-upgrade-8-1 /usr/src/agoric-sdk/netstate netstate
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh


ARG DEST_IMAGE
#this is agoric-upgrade-10 / vaults
FROM ${DEST_IMAGE} as agoric-upgrade-10
ENV THIS_NAME=agoric-upgrade-10

WORKDIR /usr/src/agoric-sdk/
COPY upgrade-test-scripts ./upgrade-test-scripts
COPY --from=agoric-upgrade-9 /usr/src/agoric-sdk/netstate netstate
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
#this is agoric-upgrade-11 / vaults+1
FROM ${DEST_IMAGE} as agoric-upgrade-11
ENV THIS_NAME=agoric-upgrade-11
# this boot doesn't need an upgrade
ENV DEST=1

WORKDIR /usr/src/agoric-sdk/
COPY upgrade-test-scripts ./upgrade-test-scripts
COPY --from=agoric-upgrade-10 /usr/src/agoric-sdk/netstate netstate
SHELL ["/bin/bash", "-c"]
RUN chmod +x ./upgrade-test-scripts/start_to_to.sh
ENTRYPOINT /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh
