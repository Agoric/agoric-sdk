#!/bin/bash
set -ueo pipefail

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

# test the state right after the previous proposals
yarn ava initial.test.js

# XXX some of these tests have path dependencies so no globs
yarn ava core-eval.test.js

npm install -g tsx
scripts/test-vaults.mts

echo ACCEPTANCE TESTING kread
yarn ava kread.test.js

echo ACCEPTANCE TESTING valueVow
yarn ava valueVow.test.js

echo ACCEPTANCE TESTING state sync
./state-sync-snapshots-test.sh
./genesis-test.sh

echo ACCEPTANCE TESTING wallet
yarn ava wallet.test.js

echo ACCEPTANCE TESTING vaults
yarn ava vaults.test.js

echo ACCEPTANCE TESTING psm
yarn ava psm.test.js

echo ACCEPTANCE TESTING governance
yarn ava governance.test.js
