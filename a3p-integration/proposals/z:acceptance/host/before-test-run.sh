#! /bin/bash
# shellcheck disable=SC2155

set -o errexit -o errtrace -o pipefail -o xtrace

CONTAINER_MESSAGE_FILE_PATH="/root/message-file-path"
DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
BRANCH_NAME="usman/monitoring-follower"
FOLLOWER_LOGS_FILE="/tmp/loadgen-follower-logs"
LOADGEN_REPOSITORY_NAME="testnet-load-generator"
LOGS_FILE="/tmp/before-test-run-hook-logs"
ORGANIZATION_NAME="agoric"
TIMESTAMP="$(date '+%s')"

CONTAINER_IMAGE_NAME="ghcr.io/$ORGANIZATION_NAME/agoric-3-proposals"
LOADGEN_REPOSITORY_LINK="https://github.com/$ORGANIZATION_NAME/$LOADGEN_REPOSITORY_NAME.git"
NETWORK_CONFIG_FILE_PATH="/tmp/network-config-$TIMESTAMP"
OUTPUT_DIRECTORY="/tmp/loadgen-output"
TEMP="${DIRECTORY_PATH#*/proposals/}"

FOLDER_NAME="${TEMP%%/*}"

PROPOSAL_NAME="$(echo "$FOLDER_NAME" | cut --delimiter ':' --fields '2')"

FOLLOWER_CONTAINER_NAME="$PROPOSAL_NAME-follower"

create_volume_assets() {
  mkdir --parents "$OUTPUT_DIRECTORY"
}

main() {
  create_volume_assets
  set_trusted_block_data
  start_follower &
}

run_command_inside_container() {
  local entrypoint="$1"
  shift

  docker container run \
    --entrypoint "/bin/bash" \
    --name "$FOLLOWER_CONTAINER_NAME" \
    --network "host" \
    --quiet \
    --rm \
    --user "root" \
    "$@" \
    "$CONTAINER_IMAGE_NAME:test-$PROPOSAL_NAME" \
    -c "$entrypoint"
}

set_trusted_block_data() {
  local entrypoint
  local last_block_info

  entrypoint="
            #! /bin/bash
            set -o errexit -o errtrace -o pipefail

            source /usr/src/upgrade-test-scripts/env_setup.sh > /dev/null 2>&1
            cat \$STATUS_FILE
        "
  last_block_info="$(
    run_command_inside_container \
      "$entrypoint"
  )"

  TRUSTED_BLOCK_HASH="$(echo "$last_block_info" | jq '.SyncInfo.latest_block_hash' --raw-output)"
  TRUSTED_BLOCK_HEIGHT="$(echo "$last_block_info" | jq '.SyncInfo.latest_block_height' --raw-output)"
}

start_follower() {
  wait_for_network_config

  local entrypoint="
                #! /bin/bash

                clone_repository() {
                        cd \$HOME
                        git clone $LOADGEN_REPOSITORY_LINK --branch $BRANCH_NAME
                }

                install_dependencies() {
                        apt-get update
                        apt-get install curl --yes
                }

                ##################################################################################
                # Hacky way to get go lang in the container                                      #
                ##################################################################################
                install_go() {
                        curl --location --output /tmp/go.tar.gz \
                         https://go.dev/dl/go1.20.6.linux-amd64.tar.gz

                        tar --directory /usr/local --extract --file /tmp/go.tar.gz --gzip
                        rm --force /tmp/go.tar.gz

                        export PATH=/usr/local/go/bin:\$PATH

                        echo 'export PATH=\"/usr/local/go/bin:\$PATH\"' >> /etc/profile
                }
                ##################################################################################

                start_loadgen() {
                        cd \$HOME/$LOADGEN_REPOSITORY_NAME
                        yarn --cwd runner install
                        AG_CHAIN_COSMOS_HOME=\$HOME/.agoric \
                        SDK_BUILD=0 \
                        ./runner/bin/loadgen-runner \
                         --chain-only \
                         --custom-bootstrap \
                         --integrate-acceptance \
                         --no-stage.save-storage \
                         --output-dir ./results/a3p-test/ \
                         --profile testnet \
                         --stages 2 \
                         --testnet-origin file://$NETWORK_CONFIG_FILE_PATH \
                         --use-state-sync
                }

                install_dependencies
                install_go
                clone_repository
                start_loadgen
        "
  run_command_inside_container \
    "$entrypoint" \
    --env "MESSAGE_FILE_PATH=$CONTAINER_MESSAGE_FILE_PATH" \
    --env "OUTPUT_DIR=$OUTPUT_DIRECTORY" \
    --env "TRUSTED_BLOCK_HASH=$TRUSTED_BLOCK_HASH" \
    --env "TRUSTED_BLOCK_HEIGHT=$TRUSTED_BLOCK_HEIGHT" \
    --mount "source=$MESSAGE_FILE_PATH,target=$CONTAINER_MESSAGE_FILE_PATH,type=bind" \
    --mount "source=$OUTPUT_DIRECTORY,target=$OUTPUT_DIRECTORY,type=bind" \
    --mount "source=$NETWORK_CONFIG_FILE_PATH,target=$NETWORK_CONFIG_FILE_PATH/network-config,type=bind" > "$FOLLOWER_LOGS_FILE"
}

wait_for_network_config() {
  local network_config=$(node "$DIRECTORY_PATH/../wait-for-follower.mjs" "^{.*")
  echo "Got network config: $network_config"
  echo "$network_config" > "$NETWORK_CONFIG_FILE_PATH"
}

main > "$LOGS_FILE" 2>&1
