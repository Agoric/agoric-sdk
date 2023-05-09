#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

alias agops="yarn run --silent agops"


# verify that PSM came back in a working state


# This is what a test_val command looks like:
# test_val "$(agd q bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | length')" "0"

# original:
# agops psm swap --wantMinted 6 --feePct 0.01 --offerId 123  | jq '.body |fromjson | .offer.id'

echo "   TRYING" 'yarn run psm info'
yarn run --silent agops psm info --pair [Minted.Anchor]

echo "   TRYING" 'yarn run psm swap'
yarn run --silent agops psm swap --wantMinted 6 --feePct 0.01 --offerId 123  | jq '.body |fromjson | .offer.id'

echo "   TRYING" 'test_val'   # fails

test_val "$(agops vaults list --from gov1 --keyring-backend='test')" "0"

echo "   TRYING" bin/agops

# adjust
OFFER=$(mktemp -t agops.XXX)
bin/agops vaults adjust --vaultId vault0 --giveCollateral 1.0 --from gov1 --keyring-backend="test" >|"$OFFER"
agoric wallet print --file "$OFFER"
agoric wallet send --from gov1 --keyring-backend="test" --offer "$OFFER"
