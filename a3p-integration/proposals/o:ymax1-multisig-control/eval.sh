#!/bin/bash
set -euo pipefail

# ymax1 was already deployed by g:ymax1/use.sh; delegatePortfolioContract
# below picks up the live kit via getUpgradeKit.

cp /usr/src/upgrade-test-scripts/eval_submission.js .
yarn node ./eval_submission.js
