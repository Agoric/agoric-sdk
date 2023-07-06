#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 5

# CWD is agoric-sdk
upgradeScripts=packages/deployment/upgrade-test/upgrade-test-scripts

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $upgradeScripts/vat-status.mjs zoe)" "0" "zoe vat incarnation"
