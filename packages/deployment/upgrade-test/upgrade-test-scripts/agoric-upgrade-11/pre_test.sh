#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 5

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

test_val "$(agd query vstorage children published.boardAux -o json | jq .children)" "[]" "no boardAux children yet"

# zoe vat is at incarnation 0
test_val "$(yarn --silent node $upgrade11/tools/vat-status.mjs zoe)" "0" "zoe vat incarnation"

# validate agoric-upgrade-10 metrics after update

test_val $(agd q vstorage children published.vaultFactory.managers.manager0.vaults -o json | jq -r '.children | length') 3 "we have three vaults"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.numActiveVaults') 1 "only one vault is active"

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalDebt.value') "6030000" "totalDebt is correct"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.metrics -o jsonlines | jq -r '.totalCollateral.value') "8000000" "totalCollateral is correct"

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.vaultState') "active" "vault0 is open"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.locked.value') "8000000" "vault0 contains 8 ATOM collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault0 -o jsonlines | jq -r '.debtSnapshot.debt.value') "6030000" "vault0 debt is 6.03 IST"

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.vaultState') "closed" "vault1 is closed"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.locked.value') "0" "vault1 contains no collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault1 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault1 has no debt"

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.vaultState') "closed" "vault2 is closed"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.locked.value') "0" "vault2 contains no collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault2 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault2 has no debt"
