# Defaults
ARG SDK_IMAGE=ghcr.io/agoric/agoric-sdk:dev
ARG BOOTSTRAP_MODE=main

## FIRST LAYER
# on agoric-uprade-7-2, with upgrade to agoric-upgrade-8
FROM ghcr.io/agoric/ag0:agoric-upgrade-7-2 as agoric-upgrade-7-2
ARG BOOTSTRAP_MODE
ARG UPGRADE_INFO_8
ENV UPGRADE_TO=agoric-upgrade-8 UPGRADE_INFO=${UPGRADE_INFO_8} THIS_NAME=agoric-upgrade-7-2 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
RUN echo "${BOOTSTRAP_MODE}"
RUN mkdir -p /usr/src/agoric-sdk/upgrade-test-scripts
WORKDIR /usr/src/agoric-sdk/
COPY ./start_ag0.sh ./upgrade-test-scripts/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
# this is the only layer that starts ag0
RUN . ./upgrade-test-scripts/start_ag0.sh

## UPGRADE LAYER
## this is agoric-upgrade-8 aka pismoA
FROM ghcr.io/agoric/agoric-sdk:29 as agoric-upgrade-8
ARG BOOTSTRAP_MODE
# ??? why doesn't this set UPGRADE_TO ?
ENV THIS_NAME=agoric-upgrade-8 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
# copy from previous build
COPY --from=agoric-upgrade-7-2 /root/.agoric /root/.agoric

#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh
#endregion

## UPGRADE LAYER
#this is agoric-upgrade-8-1 aka pismoB
FROM ghcr.io/agoric/agoric-sdk:30 as agoric-upgrade-8-1
# Each upgrade layer has this argument to let developers specify an UPGRADE_INFO JSON for each layer
ARG BOOTSTRAP_MODE UPGRADE_INFO_9
ENV THIS_NAME=agoric-upgrade-8-1 UPGRADE_TO=agoric-upgrade-9 UPGRADE_INFO=${UPGRADE_INFO_9} BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
COPY --from=agoric-upgrade-8 /root/.agoric /root/.agoric
#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh
#endregion

## UPGRADE LAYER
# this is agoric-upgrade-9 / pismoC with upgrade to agoric-upgrade-10
FROM ghcr.io/agoric/agoric-sdk:31 as agoric-upgrade-9
ARG BOOTSTRAP_MODE UPGRADE_INFO_10
ENV THIS_NAME=agoric-upgrade-9 UPGRADE_TO=agoric-upgrade-10 UPGRADE_INFO=${UPGRADE_INFO_10} BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
COPY --from=agoric-upgrade-8-1 /root/.agoric /root/.agoric
#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh
#endregion

## UPGRADE LAYER
#this is agoric-upgrade-10 / vaults
FROM ghcr.io/agoric/agoric-sdk:35 as agoric-upgrade-10
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-10 USE_JS=1 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
COPY --from=agoric-upgrade-9 /root/.agoric /root/.agoric
#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh
#endregion

## UPGRADE LAYER
#this is agoric-upgrade-10 upgrading to 11
#it's a separate target because agoric-upgrade-10 takes so long to test
FROM ghcr.io/agoric/agoric-sdk:35 as agoric-upgrade-10-to-11
# This default UPGRADE_INFO_11 is to test core proposals like the network vat.
# TODO: Maybe replace with a Zoe core proposal, or remove when other paths test it.
ARG BOOTSTRAP_MODE UPGRADE_INFO_11='{"coreProposals":["@agoric/builders/scripts/vats/init-network.js"]}'
ENV THIS_NAME=agoric-upgrade-10-to-11 UPGRADE_TO=agoric-upgrade-11 UPGRADE_INFO=${UPGRADE_INFO_11} BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
COPY --from=agoric-upgrade-10 /root/.agoric /root/.agoric
#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh
#endregion

# DEVELOPMENT LAYER
# allow specifying a different SDK image
ARG SDK_IMAGE
#this is agoric-upgrade-11 / vstorage updates
FROM ${SDK_IMAGE} as agoric-upgrade-11
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-11 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
COPY --from=agoric-upgrade-10-to-11 /root/.agoric /root/.agoric
#region boilerplate to copy scripts for this upgrade
# This does more than it needs to in some steps, to simplify maintenance in its repeated use
WORKDIR /usr/src/agoric-sdk/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./package.json ./*.mjs ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
# this boot doesn't need an upgrade
#endregion
# RUN . ./upgrade-test-scripts/start_to_to.sh
# provide tmux for use with TMUX_CC=1
RUN apt install -y tmux
# interactive shell for this whole Dockerfile
ENTRYPOINT /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh
