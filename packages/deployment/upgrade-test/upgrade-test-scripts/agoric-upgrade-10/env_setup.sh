#!/bin/bash

# agoric-upgrade-10 specific env here...
export USER2ADDR=$($binary keys show user2 -a --keyring-backend="test" 2> /dev/null)

printKeys() {
  echo "========== GOVERNANCE KEYS =========="
  echo "gov1: $GOV1ADDR"
  cat ~/.agoric/gov1.key || true
  echo "gov2: $GOV2ADDR"
  cat ~/.agoric/gov2.key || true
  echo "gov3: $GOV3ADDR"
  cat ~/.agoric/gov3.key || true
  echo "validator: $VALIDATORADDR"
  cat ~/.agoric/validator.key || true
  echo "user1: $USER1ADDR"
  cat ~/.agoric/user1.key || true
  echo "user2: $USER2ADDR"
  cat ~/.agoric/user2.key || true
  echo "========== GOVERNANCE KEYS =========="
}

pushPrice () {
  echo ACTIONS pushPrice $1
  newPrice="${1:-10.00}"
  for oracleNum in {1..2}; do
    if [[ ! -e "$HOME/.agoric/lastOracle" ]]; then
      echo "$GOV1ADDR" > "$HOME/.agoric/lastOracle"
    fi

    lastOracle=$(cat "$HOME/.agoric/lastOracle")
    nextOracle="$GOV1ADDR"
    if [[ "$lastOracle" == "$GOV1ADDR" ]]; then
      nextOracle="$GOV2ADDR"
    fi
    echo "Pushing Price from oracle $nextOracle"

    oid="${nextOracle}_ORACLE"
    offer=$(mktemp -t pushPrice.XXX)
    agops oracle pushPriceRound --price "$newPrice" --oracleAdminAcceptOfferId "${!oid}" >|"$offer"
    sleep 1
    timeout --preserve-status 15 yarn run --silent agops perf satisfaction --from $nextOracle --executeOffer "$offer" --keyring-backend test
    if [ $? -ne 0 ]; then
      echo "WARNING: pushPrice for $nextOracle failed!"
    fi
    echo "$nextOracle" > "$HOME/.agoric/lastOracle"
  done
}


# variant of pushPrice() that figures out which oracle to send from
# WIP because it doesn't always work
pushPriceOnce () {
  echo ACTIONS pushPrice $1
  newPrice="${1:-10.00}"
  timeout 3 agoric follow -lF :published.priceFeed.ATOM-USD_price_feed.latestRound -ojson > "$HOME/.agoric/latestRound-ATOM.json"
  
  lastStartedBy=$(jq -r .startedBy "$HOME/.agoric/latestRound-ATOM.json" || echo null)
  echo lastStartedBy $lastStartedBy
  nextOracle="ERROR"
  # cycle to next among oracles (first of the two governance accounts)
  case $lastStartedBy in
    "$GOV1ADDR") nextOracle=$GOV2ADDR;;
    "$GOV2ADDR") nextOracle=$GOV1ADDR;;
    *)
      echo last price was pushed by a different account, using GOV1
      nextOracle=$GOV1ADDR
      ;;
  esac
  echo nextOracle $nextOracle

  adminOfferId="${nextOracle}_ORACLE"

  echo "Pushing Price from oracle $nextOracle with offer $adminOfferId"

  offer=$(mktemp -t pushPrice.XXX)
  agops oracle pushPriceRound --price "$newPrice" --oracleAdminAcceptOfferId "${adminOfferId}" >|"$offer"
  cat "$offer"
  sleep 1
  timeout --preserve-status 15 yarn run --silent agops perf satisfaction --from $nextOracle --executeOffer "$offer" --keyring-backend test
  if [ $? -eq 0 ]; then
    echo SUCCESS
  else
    echo "ERROR: pushPrice failed (using $nextOracle)"
  fi
}

# submit a DeliverInbound transaction
#
# see {agoric.swingset.MsgDeliverInbound} in swingset/msgs.proto
# https://github.com/Agoric/agoric-sdk/blob/5cc5ec8836dcd0c6e11b10799966b6e74601295d/golang/cosmos/proto/agoric/swingset/msgs.proto#L23
submitDeliverInbound() {
  sender="${1:-user1}"

  # ag-solo is a client that sends DeliverInbound transactions using a golang client
  # @see {connectToChain} in chain-cosmos-sdk.js
  # runHelper
  # https://github.com/Agoric/agoric-sdk/blob/5cc5ec8836dcd0c6e11b10799966b6e74601295d/packages/solo/src/chain-cosmos-sdk.js

  # The payload is JSON.stringify([messages, highestAck])
  # https://github.com/Agoric/agoric-sdk/blob/5cc5ec8836dcd0c6e11b10799966b6e74601295d/packages/solo/src/chain-cosmos-sdk.js#L625
  # for example, this json was captured from a running `agoric start local-solo`
  json='[[[1,"1:0:deliver:ro+1:rp-44;#[\"getConfiguration\",[]]"]],0]'

  agd tx swingset deliver "${json}" \
      --chain-id="$CHAINID" -ojson --yes \
      --from="$sender" --keyring-backend=test -b block
}

make_swing_store_snapshot() {( set -euo pipefail
  EXPORT_DIR="$1"
  shift
  /usr/src/agoric-sdk/packages/cosmic-swingset/src/export-kernel-db.js --home "$HOME/.agoric" --export-dir "$EXPORT_DIR" --verbose --include-export-data "$@"

  EXPORT_MANIFEST_FILE="$EXPORT_DIR/export-manifest.json"
  EXPORT_DATA_FILE="$EXPORT_DIR/$(cat "$EXPORT_MANIFEST_FILE" | jq -r .data)"
  EXPORT_DATA_UNTRUSTED_FILE="${EXPORT_DATA_FILE%.*}-untrusted.jsonl"
  EXPORT_HEIGHT=$(cat "$EXPORT_MANIFEST_FILE" | jq -r .blockHeight)
  EXPORT_MANIFEST="$(cat $EXPORT_MANIFEST_FILE)"

  mv "$EXPORT_DATA_FILE" "$EXPORT_DATA_UNTRUSTED_FILE"
  agd export --height $EXPORT_HEIGHT | jq -cr '.app_state.vstorage.data[] | if .path | startswith("swingStore.") then [.path[11:],.value] else empty end' > "$EXPORT_DATA_FILE"

  jq -n "$EXPORT_MANIFEST | .untrustedData=\"$(basename -- "$EXPORT_DATA_UNTRUSTED_FILE")\"" > "$EXPORT_MANIFEST_FILE"

  echo "Successful swing-store export for block $EXPORT_HEIGHT"
)}

restore_swing_store_snapshot() {( set -euo pipefail
  rm -f $HOME/.agoric/data/agoric/swingstore.sqlite

  /usr/src/agoric-sdk/packages/cosmic-swingset/src/import-kernel-db.js --home "$HOME/.agoric" --export-dir "$1" --verbose
)}

compare_swing_store_export_data() {
  EXPORT_DIR="$1"
  EXPORT_MANIFEST_FILE="$EXPORT_DIR/export-manifest.json"
  EXPORT_DATA_FILE="$(cat "$EXPORT_MANIFEST_FILE" | jq -r .data)"
  EXPORT_DATA_UNTRUSTED_FILE="$(cat "$EXPORT_MANIFEST_FILE" | jq -r .untrustedData)"

  if [ -z "$EXPORT_DATA_FILE" ]; then
    echo "missing-export-data"
    return
  fi
  
  if [ -z "$EXPORT_DATA_UNTRUSTED_FILE" ]; then
    echo "missing-untrusted-export-data"
    return
  fi
  
  diff <(cat "$EXPORT_DIR/$EXPORT_DATA_FILE" | sort) <(cat "$EXPORT_DIR/$EXPORT_DATA_UNTRUSTED_FILE" | sort) >&2 && {
    echo "match"
  } || {
    echo "mismatch"
  }
}
