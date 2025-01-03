#! /bin/bash

set -o errexit -o errtrace -o pipefail

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
BRANCH_NAME="usman/testing-loadgen-follower"
CHAIN_ID="agoriclocal"
FOLLOWER_API_PORT="2317"
FOLLOWER_GRPC_PORT="10090"
FOLLOWER_P2P_PORT="36656"
FOLLOWER_PPROF_PORT="7060"
FOLLOWER_RPC_PORT="36657"
LOADGEN_REPOSITORY_NAME="testnet-load-generator"
MESSAGE_FILE_NAME='message-file-path.tmp'
ORGANIZATION_NAME="agoric"
TIMESTAMP="$(date '+%s')"
VALIDATOR_NODE_ID=""
VALIDATOR_P2P_PORT="26656"
VALIDATOR_RPC_PORT="26657"

CONTAINER_IMAGE_NAME="ghcr.io/$ORGANIZATION_NAME/agoric-3-proposals"
CONTAINER_MESSAGE_FILE_PATH="/root/$MESSAGE_FILE_NAME"
HOST_MESSAGE_FILE_PATH="$HOME/$MESSAGE_FILE_NAME"
LOADGEN_REPOSITORY_LINK="https://github.com/$ORGANIZATION_NAME/$LOADGEN_REPOSITORY_NAME.git"
NETWORK_CONFIG_FILE_PATH="/tmp/network-config-$TIMESTAMP"
OUTPUT_DIRECTORY="/tmp/loadgen-output"
PROPOSAL_NAME="$(echo "$DIRECTORY_PATH" | cut --delimiter ':' --fields '2')"

FOLLOWER_CONTAINER_NAME="$PROPOSAL_NAME-follower"
FOLLOWER_LOGS_FILE="/tmp/loadgen-follower-logs"

create_volume_assets() {
    touch "$HOST_MESSAGE_FILE_PATH"
    mkdir --parents "$OUTPUT_DIRECTORY"
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

set_node_id() {
    VALIDATOR_NODE_ID="$(
        run_command_inside_container \
            "agd tendermint show-node-id"
    )"
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
                        ./start.sh \
                         --testnet-origin file://$NETWORK_CONFIG_FILE_PATH --use-state-sync
                }

                install_dependencies
                install_go
                clone_repository
                start_loadgen
        "
    run_command_inside_container \
        "$entrypoint" \
        --env "API_PORT=$FOLLOWER_API_PORT" \
        --env "GRPC_PORT=$FOLLOWER_GRPC_PORT" \
        --env "MESSAGE_FILE_PATH=$CONTAINER_MESSAGE_FILE_PATH" \
        --env "OUTPUT_DIR=$OUTPUT_DIRECTORY" \
        --env "P2P_PORT=$FOLLOWER_P2P_PORT" \
        --env "PPROF_PORT=$FOLLOWER_PPROF_PORT" \
        --env "RPC_PORT=$FOLLOWER_RPC_PORT" \
        --env "TRUSTED_BLOCK_HASH=$TRUSTED_BLOCK_HASH" \
        --env "TRUSTED_BLOCK_HEIGHT=$TRUSTED_BLOCK_HEIGHT" \
        --mount "source=$HOST_MESSAGE_FILE_PATH,target=$CONTAINER_MESSAGE_FILE_PATH,type=bind" \
        --mount "source=$OUTPUT_DIRECTORY,target=$OUTPUT_DIRECTORY,type=bind" \
        --mount "source=$NETWORK_CONFIG_FILE_PATH,target=$NETWORK_CONFIG_FILE_PATH/network-config,type=bind" >"$FOLLOWER_LOGS_FILE" &
}

write_network_config() {
    echo "
            {
                    \"chainName\": \"$CHAIN_ID\",
                    \"rpcAddrs\": [\"http://localhost:$VALIDATOR_RPC_PORT\"],
                    \"gci\": \"http://localhost:$VALIDATOR_RPC_PORT/genesis\",
                    \"peers\":[\"$VALIDATOR_NODE_ID@localhost:$VALIDATOR_P2P_PORT\"],
                    \"seeds\":[]
            }
        " >"$NETWORK_CONFIG_FILE_PATH"
}

create_volume_assets
set_node_id
set_trusted_block_data
write_network_config
start_follower
