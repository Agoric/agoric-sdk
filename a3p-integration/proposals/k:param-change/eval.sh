#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

if [ -z "$SIGN_BROADCAST_OPTS" ]; then
  echo >&2 'Missing SIGN_BROADCAST_OPTS!'
  exit 1
fi

# After the param change, proposals (including install-bundle) will require BLD.
agd tx bank send validator "$GOV1ADDR" 100000000000ubld $SIGN_BROADCAST_OPTS

min_deposit=$(agd query gov params --output json | jq -r '(.params // .deposit_params).min_deposit[0] | (.amount + .denom)')
jq --arg deposit "$min_deposit" '.deposit = $deposit' drop-ist.json > drop-ist-with-deposit.json

# shellcheck disable=SC2086
agd tx gov submit-proposal param-change drop-ist-with-deposit.json $SIGN_BROADCAST_OPTS

voteLatestProposalAndWait

sed --in-place=.bak s/'minimum-gas-prices = ".*"'/'minimum-gas-prices = "0ubld"'/ ~/.agoric/config/app.toml
