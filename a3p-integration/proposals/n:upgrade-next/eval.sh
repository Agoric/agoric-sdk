#!/bin/bash

set -euo pipefail

# evaluate the proposals in the /submission/ directory

echo "UPGRADE-19  Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .

echo RUNNING ./eval_submission.js
./eval_submission.js
