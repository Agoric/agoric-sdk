#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# shellcheck disable=SC2086
agd tx gov submit-proposal param-change drop-ist.json \
  ${SIGN_BROADCAST_OPTS="--missing-env-setup"}

voteLatestProposalAndWait

sed --in-place=.bak s/'minimum-gas-prices = ".*"'/'minimum-gas-prices = "0ubld"'/ ~/.agoric/config/app.toml
