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