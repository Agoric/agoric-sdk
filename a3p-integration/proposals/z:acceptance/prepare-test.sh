#!/bin/bash

set -o errexit -o pipefail -o xtrace

CURRENT_HEIGHT="$(node extract-block-height.mjs "$HOME/.agoric/data/agoric/swingstore.sqlite")"

SNAPSHOT_INTERVAL="$(($CURRENT_HEIGHT + 2))"
sed "/^\[state-sync]/,/^\[/{s/^snapshot-interval[[:space:]]*=.*/snapshot-interval = $SNAPSHOT_INTERVAL/}" \
 "$HOME/.agoric/config/app.toml" \
 --in-place
