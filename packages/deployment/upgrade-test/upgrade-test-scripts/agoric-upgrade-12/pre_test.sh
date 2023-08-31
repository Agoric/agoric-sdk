#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# CWD is agoric-sdk
upgrade12=./upgrade-test-scripts/agoric-upgrade-12

# test that the network vat was installed (see UPGRADE_INFO_12)
test_val "$(yarn --silent node $upgrade12/tools/vat-status.mjs network)" "0" "network vat incarnation"

test_val "$(agd query vstorage children published.boardAux -o json | jq .children)" "[]" "no boardAux children yet"

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $upgrade12/tools/vat-status.mjs zoe)" "0" "zoe vat incarnation"
