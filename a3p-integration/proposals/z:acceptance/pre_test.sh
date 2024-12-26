#! /bin/bash

set -o errexit -o errtrace -o pipefail

AGORIC_HOME="\$HOME/.agoric"
DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
LOADGEN_REPOSITORY_NAME="testnet-load-generator"
ORGANIZATION_NAME="agoric"
TRUSTED_BLOCK_HASH=""
TRUSTED_BLOCK_HEIGHT=""

LOADGEN_REPOSITORY_LINK="https://github.com/$ORGANIZATION_NAME/$LOADGEN_REPOSITORY_NAME.git"
PROPOSAL_NAME="$(echo "$DIRECTORY_PATH" | cut --delimiter ':' --fields '2')"
CONTAINER_IMAGE_NAME="ghcr.io/$ORGANIZATION_NAME/agoric-3-proposals"

run_command_inside_container() {
    local entrypoint="$1"
    docker run \
        --entrypoint "/bin/bash" \
        --quiet \
        --rm \
        --user "root" \
        "$CONTAINER_IMAGE_NAME:use-$PROPOSAL_NAME" \
        -c "$entrypoint"
}

set_trusted_block_data() {
    local last_block_info

    last_block_info="$(run_command_inside_container "cat $AGORIC_HOME/last_observed_status")"
    TRUSTED_BLOCK_HASH="$(echo "$last_block_info" | jq '.SyncInfo.latest_block_height' --raw-output)"
    TRUSTED_BLOCK_HEIGHT="$(echo "$last_block_info" | jq '.SyncInfo.latest_block_hash' --raw-output)"
    echo "TRUSTED_BLOCK_HASH: $TRUSTED_BLOCK_HASH"
    echo "TRUSTED_BLOCK_HEIGHT: $TRUSTED_BLOCK_HEIGHT"
}

start_follower() {
    local entrypoint="
        #! /bin/bash
        set -o errexit -o errtrace -o pipefail

        cd \$HOME
        git clone $LOADGEN_REPOSITORY_LINK --branch usman/testing-loadgen-follower
        cd $LOADGEN_REPOSITORY_NAME
        TRUSTED_BLOCK_HASH=$TRUSTED_BLOCK_HASH \
        TRUSTED_BLOCK_HEIGHT=$TRUSTED_BLOCK_HEIGHT \
        ./start.sh
    "
    echo "entrypoint: $entrypoint"
    run_command_inside_container "$entrypoint" &
}

echo "DIRECTORY_PATH: $DIRECTORY_PATH"
echo "PROPOSAL_NAME: $PROPOSAL_NAME"
set_trusted_block_data
start_follower
