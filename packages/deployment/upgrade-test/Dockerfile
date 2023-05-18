ARG DEST_IMAGE=ghcr.io/agoric/agoric-sdk:latest
ARG BOOTSTRAP_MODE=main
# on agoric-uprade-7-2, with upgrade to agoric-upgrade-8
FROM ghcr.io/agoric/ag0:agoric-upgrade-7-2 as agoric-upgrade-7-2
ARG BOOTSTRAP_MODE
ENV UPGRADE_TO=agoric-upgrade-8 THIS_NAME=agoric-upgrade-7-2 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
RUN echo "${BOOTSTRAP_MODE}"
RUN mkdir -p /usr/src/agoric-sdk/upgrade-test-scripts
WORKDIR /usr/src/agoric-sdk/
COPY ./start_ag0.sh ./upgrade-test-scripts/
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_ag0.sh

## this is agoric-upgrade-8 aka pismoA
FROM ghcr.io/agoric/agoric-sdk:29 as agoric-upgrade-8
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-8 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
WORKDIR /usr/src/agoric-sdk/

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked   \
    apt-get update && apt-get install -y tmux
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
COPY --from=agoric-upgrade-7-2 /root/.agoric /root/.agoric
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
#this is agoric-upgrade-8-1 aka pismoB
FROM ghcr.io/agoric/agoric-sdk:30 as agoric-upgrade-8-1
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-8-1 UPGRADE_TO=agoric-upgrade-9 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}

WORKDIR /usr/src/agoric-sdk/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked   \
    apt-get update && apt-get install -y tmux
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
COPY --from=agoric-upgrade-8 /root/.agoric /root/.agoric
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
# this is agoric-upgrade-9 / pismoC with upgrade to agoric-upgrade-10
FROM ghcr.io/agoric/agoric-sdk:31 as agoric-upgrade-9
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-9 UPGRADE_TO=agoric-upgrade-10 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}

WORKDIR /usr/src/agoric-sdk/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked   \
    apt-get update && apt-get install -y tmux
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
COPY --from=agoric-upgrade-8-1 /root/.agoric /root/.agoric
WORKDIR /usr/src/agoric-sdk/
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh


ARG DEST_IMAGE
#this is agoric-upgrade-10 / vaults
FROM ${DEST_IMAGE} as agoric-upgrade-10
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-10 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}

WORKDIR /usr/src/agoric-sdk/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked   \
    apt-get update && apt-get install -y tmux
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
COPY --from=agoric-upgrade-9 /root/.agoric /root/.agoric
RUN chmod +x ./upgrade-test-scripts/*.sh
SHELL ["/bin/bash", "-c"]
RUN . ./upgrade-test-scripts/start_to_to.sh

ARG DEST_IMAGE
#this is agoric-upgrade-11 / vaults+1
FROM ${DEST_IMAGE} as agoric-upgrade-11
ARG BOOTSTRAP_MODE
ENV THIS_NAME=agoric-upgrade-11 BOOTSTRAP_MODE=${BOOTSTRAP_MODE}
# this boot doesn't need an upgrade

WORKDIR /usr/src/agoric-sdk/
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked   \
    apt-get update && apt-get install -y tmux
COPY ./bash_entrypoint.sh ./env_setup.sh ./start_to_to.sh ./upgrade-test-scripts/
COPY ./${THIS_NAME} ./upgrade-test-scripts/${THIS_NAME}/
COPY --from=agoric-upgrade-10 /root/.agoric /root/.agoric
SHELL ["/bin/bash", "-c"]
RUN chmod +x ./upgrade-test-scripts/*.sh
ENTRYPOINT /usr/src/agoric-sdk/upgrade-test-scripts/start_to_to.sh
