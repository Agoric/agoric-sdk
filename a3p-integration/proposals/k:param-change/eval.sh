#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

if [ -z "$SIGN_BROADCAST_OPTS" ]; then
  echo >&2 'Missing SIGN_BROADCAST_OPTS!'
  exit 1
fi

# After the param change, proposals (including install-bundle) will require BLD.
agd tx bank send validator "$GOV1ADDR" 10000000000ubld $SIGN_BROADCAST_OPTS

# shellcheck disable=SC2086
agd tx gov submit-proposal param-change drop-ist.json $SIGN_BROADCAST_OPTS

voteLatestProposalAndWait

sed --in-place=.bak s/'minimum-gas-prices = ".*"'/'minimum-gas-prices = "0ubld"'/ ~/.agoric/config/app.toml
