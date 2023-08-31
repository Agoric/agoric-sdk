#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 5

# CWD is agoric-sdk
upgrade12=./upgrade-test-scripts/agoric-upgrade-12

test_val "$(agd query vstorage children published.boardAux -o json | jq .children)" "[]" "no boardAux children yet"

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $upgrade12/tools/vat-status.mjs zoe)" "0" "zoe vat incarnation"
