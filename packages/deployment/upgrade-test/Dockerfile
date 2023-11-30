# Defaults
ARG BASE_IMAGE=ghcr.io/agoric/agoric-3-proposals:main
ARG DEST_IMAGE=ghcr.io/agoric/agoric-sdk:dev
ARG BOOTSTRAP_MODE=main

# TODO different naming scheme for upgrade handler (in app.go) and the image name

# UPGRADE
FROM ${BASE_IMAGE} as propose-unreleased-upgrade
# TODO: Replace with actual Zoe core proposal for vat upgrades (MCS, Kread, Zoe, restart-contracts, etc)
ARG BOOTSTRAP_MODE UPGRADE_INFO='{"coreProposals":["@agoric/builders/scripts/vats/init-network.js"]}'
ENV THIS_NAME= UPGRADE_TO="UNRELEASED_UPGRADE" UPGRADE_INFO=${UPGRADE_INFO} BOOTSTRAP_MODE=${BOOTSTRAP_MODE}

WORKDIR /usr/src/agoric-sdk/
COPY --chmod=755 ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

# DEST (TEST)
#this is unreleased-upgrade
ARG DEST_IMAGE
FROM ${DEST_IMAGE} as unreleased-upgrade
ARG BOOTSTRAP_MODE
ENV THIS_NAME=unreleased-upgrade BOOTSTRAP_MODE=${BOOTSTRAP_MODE} USE_JS=1
COPY --from=propose-unreleased-upgrade /root/.agoric /root/.agoric
# start-chain boilerplate
WORKDIR /usr/src/agoric-sdk/
COPY ./env_setup.sh ./start_to_to.sh ./package.json ./*.js ./upgrade-test-scripts/
RUN cd upgrade-test-scripts && yarn
RUN echo '. /usr/src/agoric-sdk/upgrade-test-scripts/env_setup.sh' >> ~/.bashrc

COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
SHELL ["/bin/bash", "-c"]
RUN chmod +x ./upgrade-test-scripts/*.sh
# enter image in interactive shell
ENTRYPOINT /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh
