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

govaccounts2=( "$GOV1ADDR" "$GOV2ADDR" "$GOV3ADDR" )
# Accept invitation to economic committee
for i in "${govaccounts2[@]}"; do
  COMMITTEE_OFFER=$(mktemp -t agopscommittee.XXX)
  yarn run --silent agops psm committee >|"$COMMITTEE_OFFER"
  if [[ "$i" == "$GOV2ADDR" ]]; then
    sed -i "s/Voter0/Voter1/g" "$COMMITTEE_OFFER"
  fi
  if [[ "$i" == "$GOV3ADDR" ]]; then
    sed -i "s/Voter0/Voter2/g" "$COMMITTEE_OFFER"
  fi
  jq ".body | fromjson" <"$COMMITTEE_OFFER"
  yarn run --silent agops perf satisfaction --from $i --executeOffer $COMMITTEE_OFFER --keyring-backend=test
  # verify the offerId is readable from chain history
  agoric wallet show --from $i
  COMMITTEE_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$COMMITTEE_OFFER")

  echo "${i}_COMMITTEE_OFFER_ID=$COMMITTEE_OFFER_ID" >> "$HOME/.agoric/envs"
  waitForBlock 2

# Accept invitation to be a charter member
  CHARTER_OFFER=$(mktemp -t agopscharter.XXX)
  yarn run --silent agops psm charter >|"$CHARTER_OFFER"
  jq ".body | fromjson" <"$CHARTER_OFFER"
  yarn run --silent agops perf satisfaction --from $i --executeOffer $CHARTER_OFFER --keyring-backend=test

  # verify the offerId is readable from chain history
  agoric wallet show --from $i
  CHARTER_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$CHARTER_OFFER")
  echo "${i}_CHARTER_OFFER_ID=$CHARTER_OFFER_ID" >> "$HOME/.agoric/envs"
done

source "$HOME/.agoric/envs"
waitForBlock 2





# test_val "$(agd q bank balances "$GOV1ADDR" --output=json --denom uist | jq -r .amount)" "250000"

# SWAP_OFFER=$(mktemp -t agops.XXX)
# yarn run --silent agops psm swap --pair IST.ToyUSD   --wantMinted 10.00 --feePct 0.10 >|"$SWAP_OFFER"
# sendOffer "$SWAP_OFFER" $GOV1ADDR

# waitForBlock 3