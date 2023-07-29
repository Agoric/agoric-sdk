#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 5

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $upgrade11/vat-status.mjs zoe)" "0" "zoe vat incarnation"
