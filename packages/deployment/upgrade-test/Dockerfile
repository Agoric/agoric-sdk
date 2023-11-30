# Defaults
ARG BASE_IMAGE=ghcr.io/agoric/agoric-3-proposals:pr-33
ARG DEST_IMAGE=ghcr.io/agoric/agoric-sdk:dev
ARG BOOTSTRAP_MODE=main

# TODO different naming scheme for upgrade handler (in app.go) and the image name

# UPGRADE
FROM ${BASE_IMAGE} as propose-agoric-upgrade-13
ARG BOOTSTRAP_MODE UPGRADE_INFO
ENV THIS_NAME= UPGRADE_TO="agoric-upgrade-13" UPGRADE_INFO=${UPGRADE_INFO} BOOTSTRAP_MODE=${BOOTSTRAP_MODE}

WORKDIR /usr/src/agoric-sdk/
COPY --chmod=755 ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

# DEST (TEST)
#this is agoric-upgrade-13
ARG DEST_IMAGE
FROM ${DEST_IMAGE} as agoric-upgrade-13
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-13 BOOTSTRAP_MODE=${BOOTSTRAP_MODE} USE_JS=1
COPY --from=propose-agoric-upgrade-13 /root/.agoric /root/.agoric
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
