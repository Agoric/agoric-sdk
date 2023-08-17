#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# NOTE: agoric follow doesn't have the `-F` parameter in this version
# so we use a hack

# create unused wallet
agd keys add user2 --keyring-backend=test  2>&1 | tee "$HOME/.agoric/user2.out"
cat "$HOME/.agoric/user2.out" | tail -n1 | tee "$HOME/.agoric/user2.key"
export USER2ADDR=$($binary keys show user2 -a --keyring-backend="test" 2> /dev/null)
provisionSmartWallet $USER2ADDR "20000000ubld,100000000${ATOM_DENOM}"
waitForBlock

test_not_val "$(agd q vstorage data published.wallet.$USER2ADDR -o json | jq -r .value)" "" "ensure user2 provisioned"
# save somewhere we can access later
echo "Dumping PSM gov params..."
timeout 3 agoric follow -l :published.psm.${PSM_PAIR}.metrics -o jsonlines | tee /root/.agoric/psm_metrics.json
timeout 3 agoric follow -l :published.psm.${PSM_PAIR}.governance -o jsonlines | tee /root/.agoric/psm_governance.json

test_not_val "$(cat /root/.agoric/psm_metrics.json | wc -l)" "0" "psm metrics shouldnt be empty"
test_not_val "$(cat /root/.agoric/psm_governance.json | wc -l)" "0" "psm gov params shouldnt be empty"
