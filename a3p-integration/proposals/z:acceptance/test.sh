#!/bin/bash
set -ueo pipefail
# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

# test the state right after the previous proposals
yarn ava initial.test.js

npm install -g tsx
scripts/test-vaults.mts

./create-kread-item-test.sh

./state-sync-snapshots-test.sh
./genesis-test.sh

# XXX the above tests expect certain block heights so the glob of tests that
# might change state has to come last.
GLOBIGNORE=initial.test.js
yarn ava ./*.test.js
