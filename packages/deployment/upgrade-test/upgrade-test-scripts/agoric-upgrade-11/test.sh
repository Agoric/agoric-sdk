#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# CWD is agoric-sdk
upgradeScripts=packages/deployment/upgrade-test/upgrade-test-scripts

# zoe vat is at incarnation 1
test_val "$(yarn --silent node $upgradeScripts/vat-status.mjs zoe)" "1" "zoe vat incarnation"
