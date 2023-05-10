#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh
waitForBlock 3
# fund provision pool
stakeamount="20000000ibc/toyusdc"
agd tx bank send "validator" "agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346" "$stakeamount" -y --keyring-backend=test --chain-id="$CHAINID"
waitForBlock 3


govaccounts=( "$GOV1ADDR" "$GOV2ADDR" "$GOV3ADDR" )
govamount="200000000ubld,100000000ibc/toyusdc"

for i in "${govaccounts[@]}"
do
  echo "funding $i"
  agd tx bank send "validator" "$i" "$govamount" -y --keyring-backend=test --chain-id="$CHAINID"
  waitForBlock 2
  echo "provisioning $i"
  agd tx swingset provision-one my-wallet "$i" SMART_WALLET --keyring-backend=test  --yes --chain-id="$CHAINID" --from="$i"
  waitForBlock
done

waitForBlock 5


