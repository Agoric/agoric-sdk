#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# CWD is agoric-sdk
upgrade12=./upgrade-test-scripts/agoric-upgrade-12

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
