#!/bin/bash
set -ueo pipefail

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

# segregate so changing these does not invalidate the proposal image
# à la https://github.com/Agoric/agoric-3-proposals/pull/213
cd test

# test the state right after the previous proposals
yarn ava initial.test.js

# XXX some of these tests have path dependencies so no globs
yarn ava core-eval.test.js

scripts/test-vaults.ts

echo ACCEPTANCE TESTING recorded instances
yarn ava recorded-retired.test.js

echo ACCEPTANCE TESTING kread
yarn ava kread.test.js

echo ACCEPTANCE TESTING valueVow
yarn ava valueVow.test.js

echo ACCEPTANCE TESTING wallet
yarn ava wallet.test.js

echo ACCEPTANCE TESTING psm
yarn ava psm.test.js

echo ACCEPTANCE TESTING vaults
yarn ava vaults.test.js

echo ACCEPTANCE TESTING governance
yarn ava governance.test.js

echo ACCEPTANCE TESTING stake BLD
# XXX correct misnaming
# UNTIL https://github.com/Agoric/agoric-3-proposals/issues/212
DELEGATOR_ADDRRESS=$VALIDATORADDR
VALIDATOR_ADDRESS=$(agd query staking delegations "$DELEGATOR_ADDRRESS" --output json | jq -r ".delegation_responses[0].delegation.validator_address")
export VALIDATOR_ADDRESS
echo "VALIDATOR_ADDRESS: $VALIDATOR_ADDRESS from delegator $DELEGATOR_ADDRRESS (named 'VALIDATORADDR' in env)"

yarn ava stakeBld.test.js

echo ACCEPTANCE TESTING state sync
./state-sync-snapshots-test.sh
./genesis-test.sh
