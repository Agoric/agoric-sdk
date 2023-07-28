#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 5

# CWD is agoric-sdk
here=./upgrade-test-scripts/agoric-upgrade-11

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $here/zoe-upgrade/vat-status.mjs zoe)" "0" "zoe vat incarnation"
