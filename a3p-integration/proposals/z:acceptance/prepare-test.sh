#!/bin/bash

set -o errexit -o pipefail -o xtrace

source /usr/src/upgrade-test-scripts/env_setup.sh

SNAPSHOT_INTERVAL="$(($(cat "$STATUS_FILE" | jq --raw-output '.SyncInfo.latest_block_height') + 2))"
sed "/^\[state-sync]/,/^\[/{s/^snapshot-interval[[:space:]]*=.*/snapshot-interval = $SNAPSHOT_INTERVAL/}" \
 "$HOME/.agoric/config/app.toml" \
 --in-place
