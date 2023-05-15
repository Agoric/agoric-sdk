#!/bin/bash
. ./upgrade-test-scripts/env_setup.sh
# provision pool has right balance 
test_val $(agd query bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | first | .amount') "19250000"

# ensure PSM IST has only ToyUSD
expnum=4
if [[ "$BOOTSTRAP_MODE" == "test" ]]; then
    expnum=1
fi
test_val $(agd q vstorage children published.psm.IST -o json | jq -r '.children | length') "$expnum"
test_val $(agd q vstorage children published.psm.IST -o json | jq -r '.children | first') ${PSM_PAIR//IST./}

# Gov params
test_not_val "$(timeout 3 agoric follow -l :published.psm.${PSM_PAIR}.governance -o jsonlines | jq -r '.current.MintLimit.value.value')" "0" "PSM MintLimit non-zero"