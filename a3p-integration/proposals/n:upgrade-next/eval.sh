#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

# The upgrade-vaults proposal needs to know the existing vaultDirector
# parameters in order to cleanly upgrade the contract. The governance notifier
# it relies on doesn't give the most recent value if there were no updates to
# the parameters, so we'll do a governance action to reset them to their current
# values so the notifier will work.

./resetChargingPeriod.js

cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js
