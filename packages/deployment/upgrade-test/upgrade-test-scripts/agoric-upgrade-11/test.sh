#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

# zoe vat is at incarnation 1
test_val "$(yarn --silent node $upgrade11/vat-status.mjs zoe)" "1" "zoe vat incarnation"
