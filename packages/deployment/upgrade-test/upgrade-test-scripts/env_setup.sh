#!/bin/bash

echo ENV_SETUP starting

# TODO what else should be in here?
export DEBUG="SwingSet:ls,SwingSet:vat"

export CHAINID=agoriclocal
shopt -s expand_aliases

alias agops="yarn run --silent agops"
if test -f "$HOME/.agoric/envs"; then
  source "$HOME/.agoric/envs"
fi

export binary=ag0
if [ -x "$(command -v "agd")" ]; then
  export binary=agd
fi
export GOV1ADDR=$($binary keys show gov1 -a --keyring-backend="test")
export GOV2ADDR=$($binary keys show gov2 -a --keyring-backend="test")
export GOV3ADDR=$($binary keys show gov3 -a --keyring-backend="test")
export VALIDATORADDR=$($binary keys show validator -a --keyring-backend="test")
export USER1ADDR=$($binary keys show user1 -a --keyring-backend="test")

if [[ "$binary" == "agd" ]]; then
# Support testnet addresses
  sed -i "s/agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce/$GOV1ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang/$GOV2ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h/$GOV3ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json

# Support mainnet addresses
  sed -i "s/agoric1gx9uu7y6c90rqruhesae2t7c2vlw4uyyxlqxrx/$GOV1ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric1d4228cvelf8tj65f4h7n2td90sscavln2283h5/$GOV2ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric1zayxg4e9vd0es9c9jlpt36qtth255txjp6a8yc/$GOV3ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric14543m33dr28x7qhwc558hzlj9szwhzwzpcmw6a/d' /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric13p9adwk0na5npfq64g22l6xucvqdmu3xqe70wq/d' /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric1el6zqs8ggctj5vwyukyk4fh50wcpdpwgugd5l5/d' /usr/src/agoric-sdk/packages/vats/*.json

  # change names to gov1/2/3 since order is significant for invitation sending
  sed -i "s/Jason Potts/gov1/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/Chloe White/gov2/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/Joe Clark/gov3/g" /usr/src/agoric-sdk/packages/vats/*.json

# Oracle Addresses
  sed -i "s/agoric1krunjcqfrf7la48zrvdfeeqtls5r00ep68mzkr/$GOV1ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric1n4fcxsnkxe4gj6e24naec99hzmc4pjfdccy5nj/$GOV2ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric19uscwxdac6cf6z7d5e26e0jm0lgwstc47cpll8/d' /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric144rrhh4m09mh7aaffhm6xy223ym76gve2x7y78/d' /usr/src/agoric-sdk/packages/vats/*.json
  sed -i '/agoric19d6gnr9fyp6hev4tlrg87zjrzsd5gzr5qlfq2p/d' /usr/src/agoric-sdk/packages/vats/*.json

# committeeSize
  sed -i 's/committeeSize": 6/committeeSize": 3/g' /usr/src/agoric-sdk/packages/vats/*.json
  sed -i 's/minSubmissionCount": 3/minSubmissionCount": 1/g' /usr/src/agoric-sdk/packages/vats/*.json
fi

sendOffer() (
  offer="$1"
  from="$2"
  agoric wallet send --offer "$offer" --from "$from" --keyring-backend="test"
)

wait_for_bootstrap() {
  endpoint="localhost"
  while true; do
    if json=$(curl -s --fail -m 15 "$endpoint:26657/status"); then
      if [[ "$(echo "$json" | jq -r .jsonrpc)" == "2.0" ]]; then
        if last_height=$(echo "$json" | jq -r .result.sync_info.latest_block_height); then
          if [[ "$last_height" != "1" ]]; then
            echo "$last_height"
            return
          else
            echo "$last_height"
          fi
        fi
      fi
    fi
    sleep 2
  done
}

waitForBlock() (
  times=${1:-1}
  echo "$times"
  for ((i = 1; i <= times; i++)); do
    b1=$(wait_for_bootstrap)
    while true; do
      b2=$(wait_for_bootstrap)
      if [[ "$b1" != "$b2" ]]; then
        echo "block produced"
        break
      fi
      sleep 1
    done
  done
)

runActions() {
  action=${1:-"test"}
  if [[ -v THIS_NAME ]]; then
    if test -d "./upgrade-test-scripts/$THIS_NAME"; then
      fn="${action}.sh"
      if test -f "./upgrade-test-scripts/$THIS_NAME/$fn"; then
        echo "RUNACTION: $THIS_NAME $fn start"
        . "./upgrade-test-scripts/$THIS_NAME/$fn"
        echo "RUNACTION: $THIS_NAME $fn finished"
      fi
    else
      echo "./upgrade-test-scripts/$THIS_NAME directory is missing"
      exit 1
    fi
  else
    echo "THIS_NAME is not defined for this release, can't run action $action"
  fi
}

fail() {
  echo "FAIL: $1"
  exit 1
}

success() {
  echo "SUCCESS: $1"
}

test_val() {
  want="$2"
  got="$1"
  testname="${3:-unnamedtest}"
  if [[ "$want" != "$got" ]]; then
    fail "TEST: $testname: wanted $want, got $got"
  else
    success "TEST: $testname: wanted $want, got $got"
  fi
}

test_not_val() {
  want="$2"
  got="$1"
  testname="${3:-unnamedtest}"
  if [[ "$want" == "$got" ]]; then
    fail "TEST: $testname:  $want is equal to $got"
  else
    success "TEST: $testname: $want is not equal to $got"
  fi
}

test_wallet_state() {
  addr=$1
  want=$2
  desc=$3
  body="$(timeout 3 agoric follow -l ":published.wallet.$addr" -o text | jq -r '.body')"
  case $body in
  *'"@qclass":'*) state=old ;;
  '#{}') state=upgraded ;;
  '#'*) state=revived ;;
  *) state=$body ;;
  esac
  test_val "$state" "$want" "$desc"
}

voteLatestProposalAndWait() {
  waitForBlock
  proposal=$($binary q gov proposals -o json | jq -r '.proposals[-1].proposal_id')
  waitForBlock
  $binary tx gov deposit $proposal 50000000ubld --from=validator --chain-id="$CHAINID" --yes --keyring-backend test
  waitForBlock
  $binary tx gov vote $proposal yes --from=validator --chain-id="$CHAINID" --yes --keyring-backend test
  waitForBlock

  while true; do
    status=$($binary q gov proposal $proposal -ojson | jq -r .status)
    if [ "$status" == "PROPOSAL_STATUS_PASSED" ]; then
      break
    else
      echo "Waiting for proposal to pass"
      sleep 1
    fi
  done
}

newOfferId() {
  date +"%s%3M"
}

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
  echo "========== GOVERNANCE KEYS =========="
}

echo ENV_SETUP finished

pushPrice () {
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
  sleep 1
  timeout --preserve-status 15 yarn run --silent agops perf satisfaction --from $nextOracle --executeOffer "$offer" --keyring-backend test
  if [ $? -eq 0 ]; then
    echo SUCCESS
  else
    echo "ERROR: pushPrice failed (using $nextOracle)"
  fi
}

export USDC_DENOM="ibc/toyusdc"
# Recent transfer to Emerynet
export ATOM_DENOM="ibc/06362C6F7F4FB702B94C13CD2E7C03DEC357683FD978936340B43FBFBC5351EB"
export PSM_PAIR="IST.ToyUSD"
if [[ "$BOOTSTRAP_MODE" == "main" ]]; then
  export USDC_DENOM="ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F"
  export ATOM_DENOM="ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA"
  export PSM_PAIR="IST.USDC_axl"
fi
