#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

ls -al

npm install --global tsx

./performActions.ts

# let CORE_EVAL settle
waitForBlock 5
