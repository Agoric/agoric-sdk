#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

ls -al

npm install --global tsx

echo DEBUG retrying yarn install
yarn install

./performActions.ts

# let CORE_EVAL settle
waitForBlock 5

echo DEBUG CORE EVAL ALLEGEDLY COMPLETE
