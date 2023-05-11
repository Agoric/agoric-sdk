#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

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
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "AUSD")')" "" "AUSD in IST"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "ToyUSD")')" "" "ToyUSD in IST"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDC_axl")')" "" "USDC_axl in IST"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDC_grv")')" "" "USDC_grv in IST"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDT_axl")')" "" "USDT_axl in IST"
test_not_val "$(echo "$psmISTChildren" | jq -r '.children[] | select (. == "USDT_grv")')" "" "USDT_grv in IST"


## testing state from pismoC was preserved post bulldozer upgrade

# test that the PSM gov params were preserved
toyUSDGovernance="$(agoric follow -F :published.psm.IST.ToyUSD.governance -o jsonlines)"
test_not_val "$(echo "$toyUSDGovernance" | jq -r '.current.MintLimit.value.value')" "0" "PSM MintLimit non-zero"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.MintLimit.value.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.MintLimit.value.value')" "PSM MintLimit preserved"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.GiveMintedFee.value.numerator.value')" "0" "GiveMintedFee numerator == 0"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.GiveMintedFee.value.denominator.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.GiveMintedFee.value.denominator.value')" "GiveMintedFee denominator == 10000"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.WantMintedFee.value.numerator.value')" "0" "WantMintedFee numerator == 0"
test_val "$(echo "$toyUSDGovernance" | jq -r '.current.WantMintedFee.value.denominator.value')" "$(cat /root/.agoric/psm_governance.json | jq -r '.current.WantMintedFee.value.denominator.value')" "WantMintedFee denominator == 10000"

toyUSDMetrics="$(agoric follow -F :published.psm.IST.ToyUSD.metrics -o jsonlines)"
test_val "$(echo "$toyUSDMetrics" | jq -r '.anchorPoolBalance.value')" "$(cat /root/psm_metrics.json | jq -r '.anchorPoolBalance.value')" "anchorPoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.feePoolBalance.value')" "$(cat /root/psm_metrics.json | jq -r '.feePoolBalance.value')" "feePoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.mintedPoolBalance.value')" "$(cat /root/psm_metrics.json | jq -r '.mintedPoolBalance.value')" "mintedPoolBalance preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.totalAnchorProvided.value')" "$(cat /root/psm_metrics.json | jq -r '.totalAnchorProvided.value')" "totalAnchorProvided preserved"
test_val "$(echo "$toyUSDMetrics" | jq -r '.totalMintedProvided.value')" "$(cat /root/psm_metrics.json | jq -r '.totalMintedProvided.value')" "totalMintedProvided preserved"
