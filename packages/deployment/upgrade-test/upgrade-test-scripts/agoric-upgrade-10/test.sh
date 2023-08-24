#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# DeliverInbound from un-provisioned account is discarded
# Note: sending to a provisioned account resulted in an .outbox of
# [[1,"1:1:resolve:fulfill:rp+44:ro-20;#\"$0.Alleged: notifier\""]]
test_val $(agd query swingset mailbox $USER1ADDR -o json | jq '.value |fromjson |.outbox') '[]' "DeliverInbound (getConfiguration) is discarded"

# provision pool has right balance 
test_val $(agd query bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | first | .amount ') "18750000"

test_wallet_state "$USER1ADDR" upgraded "user1 wallet is upgraded"
test_wallet_state "$GOV1ADDR" revived "gov1 wallet is revived"
test_wallet_state "$GOV2ADDR" revived "gov2 wallet is revived"
test_wallet_state "$GOV3ADDR" revived "gov3 wallet is revived"

test_val $(agd q vstorage children published.vaultFactory.managers.manager0.vaults -o json | jq -r '.children | length') 3 "we have three vaults"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.numActiveVaults') 1 "only one vault is active"

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalDebt.value') "6030000" "totalDebt is correct"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalCollateral.value') "8000000" "totalCollateral is correct"

# gov1 vault0
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.vaultState') "active" "vault0 is open"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.locked.value') "8000000" "vault0 contains 8 ATOM collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.debtSnapshot.debt.value') "6030000" "vault0 debt is 6.03 IST"

# gov1 vault1
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.vaultState') "closed" "vault1 is closed"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.locked.value') "0" "vault1 contains no collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault1 has no debt"

# user2 vault2
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.vaultState') "closed" "vault2 is closed"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.locked.value') "0" "vault2 contains no collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault2 has no debt"

# verify state-sync would be broken
killAgd
EXPORT_DIR=$(mktemp -t -d swing-store-export-upgrade-10-XXX)
make_swing_store_snapshot $EXPORT_DIR || fail "Couldn't make swing-store snapshot"
test_val "$(compare_swing_store_export_data $EXPORT_DIR)" "mismatch" "swing-store broken state-sync"
rm -rf $EXPORT_DIR
startAgd