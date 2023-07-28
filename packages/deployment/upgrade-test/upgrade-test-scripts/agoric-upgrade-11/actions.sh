#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# CWD is agoric-sdk
here=./upgrade-test-scripts/agoric-upgrade-11

# run zoe thru "null upgrade"
$here/zoe-upgrade/zoe-upgrade-driver.sh
