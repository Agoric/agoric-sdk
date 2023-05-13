#!/bin/bash

# TODO should env_setup do this for all?
# set -ueo pipefail
set -v -x -e

. ./upgrade-test-scripts/env_setup.sh

# UNTIL we have confidence this script will succeed and let the build complete
#exit 0

# For development:
# TARGET=agoric-upgrade-10 make local_sdk build run
# agoric wallet show --from $GOV1ADDR
waitForBlock 20

echo "Tickling the wallets so they are revived"
# Until they are revived, the invitations can't be deposited. So the first action can't be to accept an invitation (because it won't be there).
govaccounts=("$GOV1ADDR" "$GOV2ADDR" "$GOV3ADDR")
cm=0
for i in "${govaccounts[@]}"; do
    for run in {1..2}; do
        echo "$i: $run: Accepting EC Committee"
        if [[ "$run" == "1" ]]; then
            timeout 3 yarn run --silent agops ec committee --send-from "$i" || true
        else
            agops ec committee --send-from "$i" --voter "$cm"
            cm=$((cm + 1))
        fi
    done
    echo "$i: Accepting EC Charter"
    agops ec charter --send-from "$i"
done

oracles=("$GOV1ADDR" "$GOV2ADDR")
for i in "${oracles[@]}"; do
    echo "$i: Accept oracle invitations"
    ORACLE_OFFER=$(mktemp -t agops.XXX)
    OFFER_ID="$(newOfferId)"
    agops oracle accept --offerId "$OFFER_ID" >|"$ORACLE_OFFER"
    agoric wallet print --file "$ORACLE_OFFER"
    agops perf satisfaction --from "$i" --executeOffer "$ORACLE_OFFER" --keyring-backend=test
    echo "${i}_ORACLE=$OFFER_ID" >> "$HOME/.agoric/envs"
done

source "$HOME/.agoric/envs"

START_FREQUENCY=600 #StartFrequency: 600s (auction runs every 10m)
CLOCK_STEP=20 #ClockStep: 20s (ensures auction completes in time)
PRICE_LOCK_PERIOD=300

FASTER_AUCTIONS_OFFER=$(mktemp -t agops.XXX)
agops auctioneer proposeParamChange --charterAcceptOfferId "$(agops ec find-continuing-id --for "charter member invitation" --from "$GOV1ADDR")" --start-frequency $START_FREQUENCY --clock-step $CLOCK_STEP --price-lock-period $PRICE_LOCK_PERIOD >|"$FASTER_AUCTIONS_OFFER"
agoric wallet print --file "$FASTER_AUCTIONS_OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$FASTER_AUCTIONS_OFFER" --keyring-backend=test

govaccounts=("$GOV1ADDR" "$GOV2ADDR" "$GOV3ADDR")
for i in "${govaccounts[@]}"; do
    agops ec vote --forPosition 0 --send-from "$i"
done

# wait for the vote to pass
sleep 65

# ensure params were changed
test_val "$(agoric follow -l -F  :published.auction.governance -o jsonlines | jq -r .current.ClockStep.value.relValue)" "$CLOCK_STEP"
test_val "$(agoric follow -l -F  :published.auction.governance -o jsonlines | jq -r .current.StartFrequency.value.relValue)" "$START_FREQUENCY"

pushPrice 12.01

# vaults
# attempt to open vaults under the minimum amount
for vid in {1..2}; do
    OFFER=$(mktemp -t agops.XXX)
    if [[ "$vid" == "2" ]]; then
        amount=3.00
        collateral=5.0
    else
        amount=2.00
        collateral=4.0
    fi
    agops vaults open --wantMinted $amount --giveCollateral $collateral >|"$OFFER"
    agoric wallet print --file "$OFFER"
    agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test || true
done

# we should still have no vaults
test_val "$(agops vaults list --from $GOV1ADDR)" "" "gov1 has no vaults"

# open up some vaults
for vid in {1..2}; do
    OFFER=$(mktemp -t agops.XXX)
    if [[ "$vid" == "2" ]]; then
        amount=6.00
        collateral=10.0
    else
        amount=5.00
        collateral=9.0
    fi
    agops vaults open --wantMinted $amount --giveCollateral $collateral >|"$OFFER"
    agoric wallet print --file "$OFFER"
    agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test
done

# remove some collateral from the first vault
OFFER=$(mktemp -t agops.XXX)
agops vaults adjust --vaultId vault0 --wantCollateral 1.0 --from $GOV1ADDR --keyring-backend="test" >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

# close the second vault
OFFER=$(mktemp -t agops.XXX)
agops vaults close --vaultId vault1 --giveMinted 6.06 --from $GOV1ADDR --keyring-backend="test" >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

# # TODO test bidding
# # TODO liquidations
# # agops inter bid by-price --price 1 --give 1.0IST  --from $GOV1ADDR --keyring-backend test
