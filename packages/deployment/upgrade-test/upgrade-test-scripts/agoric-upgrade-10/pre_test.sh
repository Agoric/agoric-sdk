#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for upgrade to settle
waitForBlock 20

# ensure there's only uist
test_val "$(agd q bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | length')" "1"
test_val "$(agd q bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances[0].denom')" "uist"

# test wallets are provisioned
test_not_val "$(agd q vstorage data published.wallet.$GOV1ADDR -o json | jq -r .value)" "" "ensure gov1 provisioned"
test_not_val "$(agd q vstorage data published.wallet.$GOV2ADDR -o json | jq -r .value)" "" "ensure gov2 provisioned"
test_not_val "$(agd q vstorage data published.wallet.$GOV3ADDR -o json | jq -r .value)" "" "ensure gov3 provisioned"

# test that we have no vaults
test_val "$(agd q vstorage data published.vaultFactory.manager0.vaults.vault0 -o json | jq -r .value)" "" "ensure no vaults exist"

# provision pool has right balance
test_val "$(agd query bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | first | .amount ')" "19250000"

# we should have more denoms in governance
psmISTChildren="$(agd q vstorage children published.psm.IST -o jsonlines)"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children | length')" "1" "more than one PSM denoms"

if [[ "$BOOTSTRAP_MODE" == "test" ]]; then
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "AUSD")')" "" "AUSD in IST"
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "ToyUSD")')" "" "ToyUSD in IST"
fi
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDC_axl")')" "" "USDC_axl in IST"
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDC_grv")')" "" "USDC_grv in IST"
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDT_axl")')" "" "USDT_axl in IST"
    test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDT_grv")')" "" "USDT_grv in IST"

## testing state from pismoC was preserved post bulldozer upgrade

# test that the PSM gov params were preserved
toyUSDGovernance="$(agoric follow -lF :published.psm.${PSM_PAIR}.governance -o jsonlines)"
test_not_val "$(echo "$toyUSDGovernance" | jq -r '.current.MintLimit.value.value')" "0" "PSM MintLimit non-zero"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.MintLimit.value.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.MintLimit.value.value')" "PSM MintLimit preserved"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.GiveMintedFee.value.numerator.value')" "0" "GiveMintedFee numerator == 0"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.GiveMintedFee.value.denominator.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.GiveMintedFee.value.denominator.value')" "GiveMintedFee denominator == 10000"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.WantMintedFee.value.numerator.value')" "0" "WantMintedFee numerator == 0"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.WantMintedFee.value.denominator.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.WantMintedFee.value.denominator.value')" "WantMintedFee denominator == 10000"

toyUSDMetrics="$(agoric follow -lF :published.psm.${PSM_PAIR}.metrics -o jsonlines)"
test_val "$(echo "$toyUSDMetrics" | jq -r '.anchorPoolBalance.value')" "$(cat /root/.agoric/psm_metrics.json | jq -r '.anchorPoolBalance.value')" "anchorPoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.feePoolBalance.value')" "$(cat /root/.agoric/psm_metrics.json | jq -r '.feePoolBalance.value')" "feePoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.mintedPoolBalance.value')" "$(cat /root/.agoric/psm_metrics.json | jq -r '.mintedPoolBalance.value')" "mintedPoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.totalAnchorProvided.value')" "$(cat /root/.agoric/psm_metrics.json | jq -r '.totalAnchorProvided.value')" "totalAnchorProvided preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.totalMintedProvided.value')" "$(cat /root/.agoric/psm_metrics.json | jq -r '.totalMintedProvided.value')" "totalMintedProvided preserved"

# test that provision pool metrics are retained across vaults upgrade
provisionPoolMetrics="$(agoric follow -lF :published.provisionPool.metrics -o jsonlines)"
test_val "$(echo "$provisionPoolMetrics" | jq -r '.totalMintedConverted.value')" "$(cat /root/.agoric/provision_pool_metrics.json | jq -r '.totalMintedConverted.value')" "totalMintedConverted preserved"
test_val "$(echo "$provisionPoolMetrics" | jq -r '.totalMintedProvided.value')" "$(cat /root/.agoric/provision_pool_metrics.json | jq -r '.totalMintedProvided.value')" "totalMintedProvided preserved"
test_val "$(echo "$provisionPoolMetrics" | jq -r '.walletsProvisioned')" "$(cat /root/.agoric/provision_pool_metrics.json | jq -r '.walletsProvisioned')" "walletsProvisioned preserved"

test_val "$(agops vaults list --from $GOV1ADDR)" "" "gov1 has no vaults"
