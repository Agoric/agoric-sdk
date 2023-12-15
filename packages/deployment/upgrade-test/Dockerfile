# Defaults
# Use a stable base image to prevent this test from breaking when
# new upgrade proposals are added to a3p.
# https://github.com/Agoric/agoric-3-proposals/pull/47 adds upgrade-13 to the base a3p image
# TODO: When https://github.com/Agoric/agoric-3-proposals/issues/25 is resolved,
#       use a tagged upgrade-13 layer instead
ARG BASE_IMAGE=ghcr.io/agoric/agoric-3-proposals:pr-47
ARG DEST_IMAGE=ghcr.io/agoric/agoric-sdk:dev

# TODO different naming scheme for upgrade handler (in app.go) and the image name

# BASE stage for the `COPY --from` below
FROM ${BASE_IMAGE} as base-wallet-factory-upgrade

# DEST (TEST)
#this is wallet-factory-upgrade
ARG DEST_IMAGE
FROM ${DEST_IMAGE} as wallet-factory-upgrade
ENV THIS_NAME=wallet-factory-upgrade USE_JS=1
COPY --from=base-wallet-factory-upgrade /root/.agoric /root/.agoric
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
