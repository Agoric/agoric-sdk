#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

# verify swing-store export-data is consistent and perform genesis style "upgrade"
killAgd
EXPORT_DIR=$(mktemp -t -d swing-store-export-upgrade-11-XXX)
make_swing_store_snapshot $EXPORT_DIR --artifact-mode none || fail "Couldn't make swing-store snapshot"
test_val "$(compare_swing_store_export_data $EXPORT_DIR)" "match" "swing-store consistent cosmos kvstore"

TMP_GENESIS_DIR=$EXPORT_DIR/genesis-export
cp $HOME/.agoric/config/genesis.json $TMP_GENESIS_DIR/old_genesis.json
cp $HOME/.agoric/data/priv_validator_state.json $TMP_GENESIS_DIR/priv_validator_state.json
rm -rf $HOME/.agoric/data
mkdir $HOME/.agoric/data
mv $TMP_GENESIS_DIR/priv_validator_state.json $HOME/.agoric/data
mv $TMP_GENESIS_DIR/* $HOME/.agoric/config/
startAgd
rm -rf $EXPORT_DIR

testMinChildren() {
    path=$1
    min=$2
    line="$(agd query vstorage children $path -o jsonlines)"
    ok=$(echo $line | jq ".children | length | . > $min")
    test_val "$ok" "true" "$path: more than $min children"
}

# Check brand aux data for more than just vbank assets
testMinChildren published.boardAux 3

testDisplayInfo() {
    name=$1
    expected=$2

    line="$(agoric follow -lF :published.agoricNames.brand -o text)"
    # find brand by name, then corresponding slot
    id=$(echo $line | jq --arg name "$name" -r '.slots as $slots | .body | gsub("^#";"") | fromjson | .[] | select(.[0] == $name) | .[1] | capture("^[$](?<slot>0|[1-9][0-9]*)") | .slot | $slots[. | tonumber]')
    echo $name Id: $id

    line="$(agoric follow -lF :published.boardAux.$id -o jsonlines)"
    displayInfo="$(echo $line | jq -c .displayInfo)"
    test_val "$displayInfo" "$expected" "$name displayInfo from boardAux"
}

testDisplayInfo IST '{"assetKind":"nat","decimalPlaces":6}'

testPurseValuePayload() {
    addr=$1
    wkAsset=$2
    expected=$3

    line="$(agoric follow -lF :published.wallet.$addr.current -o jsonlines)"
    # HACK: selecting brand by allegedName
    payload=$(echo $line | jq --arg name "$wkAsset" -c '.purses[] | select(.brand | contains($name)) | .balance.value.payload')
    test_val "$payload" "$expected" "$wkAsset purse for $addr"
}

# Smart wallet handles game Place assets?
testDisplayInfo Place '{"assetKind":"copyBag"}'
testPurseValuePayload $GOV1ADDR Place '[["Shire","1"],["Mordor","1"]]'

# zoe vat is at incarnation 1
echo "FIXME: bypassed zoe-full-upgrade validation"; return 0
test_val "$(yarn --silent node $upgrade11/tools/vat-status.mjs zoe)" "1" "zoe vat incarnation"
