#!/bin/bash
export STATEDIR=netstate
export CHAINID=localchain

alias agops="yarn run --silent agops"


export binary=ag0
if [ -x "$(command -v "agd")" ]; then
  export binary=agd
  sed -i "s/agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce/$GOV1ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric140dmkrz2e42ergjj7gyvejhzmjzurvqeq82ang/$GOV2ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
  sed -i "s/agoric1w8wktaur4zf8qmmtn3n7x3r0jhsjkjntcm3u6h/$GOV3ADDR/g" /usr/src/agoric-sdk/packages/vats/*.json
fi

export GOV1ADDR=$($binary keys show gov1 -a --keyring-backend="test" --home "$STATEDIR")
export GOV2ADDR=$($binary keys show gov2 -a --keyring-backend="test" --home "$STATEDIR")
export GOV3ADDR=$($binary keys show gov3 -a --keyring-backend="test" --home "$STATEDIR")
export VALIDATORADDR=$($binary keys show validator -a --keyring-backend="test" --home "$STATEDIR")


sendOffer () (
    offer="$1"
    from="$2"
    agoric wallet send --offer "$offer" --from "$from" --keyring-backend="test"
)

wait_for_bootstrap () {
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

waitForBlock () (
  times=${1:-1}
  echo "$times"
  for ((i=1; i <= times; i++)); do
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


runActions () {
  action=${1:-"test"}
  if [[ -v THIS_NAME ]]; then
    fn="${THIS_NAME}_${action}.sh"
    if test -f "./upgrade-test-scripts/$fn"; then
      echo "RUNACTION: $fn"
      . "./upgrade-test-scripts/$fn"
    fi
  else
    echo "THIS_NAME is not defined for this release, can't run action $action"
  fi
}

fail () {
  echo "FAIL: $1"
  exit 1
}

success () {
  echo "SUCCESS: $1"
}

test_val() {
  want="$2"
  got="$1"
  if [[ "$want" != "$got" ]]; then
    fail "wanted $want, got $got"
  else
    success "wanted $want, got $got"
  fi
}

voteLatestProposalAndWait() {
  waitForBlock
  proposal=$($binary q gov proposals -o json | jq -r '.proposals[-1].proposal_id')
  waitForBlock
  $binary tx gov deposit $proposal 50000000ubld --from=validator --chain-id="$CHAINID" --yes --home "$STATEDIR" --keyring-backend test
  waitForBlock
  $binary tx gov vote $proposal yes --from=validator --chain-id="$CHAINID" --yes  --home "$STATEDIR" --keyring-backend test
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