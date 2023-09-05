#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# verify walletFactory upgrade using ava/.js tests
cd upgrade-test-scripts
yarn install
yarn ava agoric-upgrade-11/post.test.js || exit 1
