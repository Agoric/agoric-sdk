#!/bin/bash
set -euo pipefail

# from g:ymax1/use.sh
export YMAX1_CONTROL_MNEMONIC="swing matrix country boring segment void similar cliff illness any pulse object quantum viable unveil carbon gap thunder merge screen combine core dog control"

pkg=/usr/src/agoric-sdk/packages/portfolio-deploy
$pkg/scripts/wallet-admin.ts $pkg/test/start-ymax1.ts

cp /usr/src/upgrade-test-scripts/eval_submission.js .
yarn node ./eval_submission.js
