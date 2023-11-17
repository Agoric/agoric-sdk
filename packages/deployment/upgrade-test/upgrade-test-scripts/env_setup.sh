#!/bin/bash

set -e # exit when any command fails

echo ENV_SETUP starting

# TODO what else should be in here?
export DEBUG="SwingSet:ls,SwingSet:vat"

export CHAINID=agoriclocal
shopt -s expand_aliases

alias agops="yarn run --silent agops"
if test -f "$HOME/.agoric/envs"; then
  source "$HOME/.agoric/envs"
fi

export GOV1ADDR=$(agd keys show gov1 -a --keyring-backend="test")
export GOV2ADDR=$(agd keys show gov2 -a --keyring-backend="test")
export GOV3ADDR=$(agd keys show gov3 -a --keyring-backend="test")
export VALIDATORADDR=$(agd keys show validator -a --keyring-backend="test")
export USER1ADDR=$(agd keys show user1 -a --keyring-backend="test")

startAgd() {
  agd start --log_level warn "$@" &
  AGD_PID=$!
  echo $AGD_PID > $HOME/.agoric/agd.pid
  wait_for_bootstrap
  waitForBlock 2
}

killAgd() {
  AGD_PID=$(cat $HOME/.agoric/agd.pid)
  kill $AGD_PID
  rm $HOME/.agoric/agd.pid
  wait $AGD_PID || true
}

waitAgd() {
  wait $(cat $HOME/.agoric/agd.pid)
  rm $HOME/.agoric/agd.pid
}

provisionSmartWallet() {
  i="$1"
  amount="$2"
  echo "funding $i"
  agd tx bank send "validator" "$i" "$amount" -y --keyring-backend=test --chain-id="$CHAINID"
  waitForBlock
  echo "provisioning $i"
  agd tx swingset provision-one my-wallet "$i" SMART_WALLET --keyring-backend=test  --yes --chain-id="$CHAINID" --from="$i"
  waitForBlock
  agoric wallet show --from $i
}

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
  proposal=$(agd q gov proposals -o json | jq -r '.proposals[-1].proposal_id')
  waitForBlock
  agd tx gov deposit $proposal 50000000ubld --from=validator --chain-id="$CHAINID" --yes --keyring-backend test
  waitForBlock
  agd tx gov vote $proposal yes --from=validator --chain-id="$CHAINID" --yes --keyring-backend test
  waitForBlock

  while true; do
    status=$(agd q gov proposal $proposal -ojson | jq -r .status)
    case $status in
    PROPOSAL_STATUS_PASSED)
      break
      ;;
    PROPOSAL_STATUS_REJECTED)
      echo "Proposal rejected"
      exit 1
      ;;
    *)
      echo "Waiting for proposal to pass (status=$status)"
      sleep 1
    esac
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


export USDC_DENOM="ibc/toyusdc"
# Recent transfer to Emerynet
export ATOM_DENOM="ibc/06362C6F7F4FB702B94C13CD2E7C03DEC357683FD978936340B43FBFBC5351EB"
export PSM_PAIR="IST.ToyUSD"
if [[ "$BOOTSTRAP_MODE" == "main" ]]; then
  export USDC_DENOM="ibc/295548A78785A1007F232DE286149A6FF512F180AF5657780FC89C009E2C348F"
  export ATOM_DENOM="ibc/BA313C4A19DFBF943586C0387E6B11286F9E416B4DD27574E6909CABE0E342FA"
  export PSM_PAIR="IST.USDC_axl"
fi

# additional env specific to a version
if [[ -n "$THIS_NAME" ]] && test -f ./upgrade-test-scripts/$THIS_NAME/env_setup.sh; then
  echo ENV_SETUP found $THIS_NAME specific env, importing...
  . ./upgrade-test-scripts/$THIS_NAME/env_setup.sh
  echo ENV_SETUP imported $THIS_NAME specific env
fi

echo ENV_SETUP finished
