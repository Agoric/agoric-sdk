#!/bin/bash
set -euo pipefail

# shellcheck disable=SC1091
source /usr/src/upgrade-test-scripts/env_setup.sh

set -o xtrace

AGORIC_HOME="$HOME/.agoric"

CHAIN_ID="$(jq --raw-output '.chain_id' < "$AGORIC_HOME/config/genesis.json")"
IP_ADDRESS="$(hostname --ip-address)"
NODE_ID="$(agd tendermint show-node-id)"

LATEST_BLOCK_HEIGHT="$(jq -e --raw-output '.sync_info // .SyncInfo | .latest_block_height' < "$STATUS_FILE")"
LATEST_BLOCK_HASH="$(jq -e --raw-output '.sync_info // .SyncInfo | .latest_block_hash' < "$STATUS_FILE")"

echo -n "{\"chainName\": \"$CHAIN_ID\", \"rpcAddrs\": [\"$IP_ADDRESS:26657\"], \"gci\": \"$IP_ADDRESS:26657/genesis\", \"peers\":[\"$NODE_ID@$IP_ADDRESS:26656\"], \"seeds\":[], \"trustedBlockInfo\": {\"height\": \"$LATEST_BLOCK_HEIGHT\", \"hash\": \"$LATEST_BLOCK_HASH\"}}" > "$MESSAGE_FILE_PATH"

SNAPSHOT_INTERVAL="$(("$LATEST_BLOCK_HEIGHT" + 1))"
sed "s/^snapshot-interval\s*=.*/snapshot-interval = $SNAPSHOT_INTERVAL/" \
  "$AGORIC_HOME/config/app.toml" \
  --in-place

# Nuke old snapshots to prevent them from interfering
rm -rf "$AGORIC_HOME/data/snapshots/"
