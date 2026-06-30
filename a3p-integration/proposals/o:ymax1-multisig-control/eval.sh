#!/bin/bash
set -euo pipefail

cp /usr/src/upgrade-test-scripts/eval_submission.js .
yarn node ./eval_submission.js
