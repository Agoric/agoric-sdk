#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

OFFER=$(mktemp -t agops.XXX)
agops vaults open --wantMinted 6.00 --giveCollateral 9.0 >|"$OFFER"
agoric wallet send --offer "$OFFER" --from gov1 --keyring-backend="test"


govamount="200000000ubld"
provisionSmartWallet $GOV1ADDR $govamount

KREAD_ITEM_OFFER=$(mktemp -t kreadItem.XXX)
node ./generate-kread-item-request.mjs > $KREAD_ITEM_OFFER
agops perf satisfaction --from $GOV1ADDR --executeOffer $KREAD_ITEM_OFFER --keyring-backend=test

agd query vstorage data published.wallet.$GOV1ADDR.current  -o json >& gov1.out
name=`jq '.value | fromjson | .values[2] | fromjson | .body[1:] | fromjson | .purses[1].balance.value.payload[0][0].name ' gov1.out`
test_val $name \"ephemeral_Ace\" "found KREAd character"
