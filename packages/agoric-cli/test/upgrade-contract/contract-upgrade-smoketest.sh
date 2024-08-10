#!/bin/sh

if [ -z "$AGORIC_NET" ]; then
  echo "AGORIC_NET env not set"
  echo
  echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
  echo
  echo "To test locally, AGORIC_NET=local and have the following running:
# freshen sdk
yarn install && yarn build

# local chain running with wallet provisioned
packages/agoric-cli/test/start-local-chain.sh
"
  exit 1
fi

set -ex

PROPDIR=$(mktemp -d -t proposal.XXX)
PROPDIR2=$(mktemp -d -t proposal.XXX)
trap 'rm -rf "$PROPDIR" "$PROPDIR2"' EXIT
ORIGDIR=$(pwd)

enactCoreEval() {
  dir="$1"
  expect_wants=${2-true}
  for f in "$dir"/cache/*.json; do
    case "$f" in
      */"*.json") continue ;;
    esac
    agd tx swingset install-bundle "@$f" \
      --from gov1 --keyring-backend=test --gas=auto \
      --chain-id=agoriclocal -bblock --yes
  done

  permit=$(ls "$dir"/*.json)
  code=$(ls "$dir"/*.js)
  make -C ../cosmic-swingset scenario2-core-eval EVAL_CODE="$code" EVAL_PERMIT="$permit"
  propnum=$(agd query gov proposals --limit=1000000 --count-total -o json | jq -r '.pagination.total')
  make -C ../cosmic-swingset scenario2-vote VOTE_PROPOSAL="$propnum" VOTE_OPTION=yes

  while true; do
    status=$(agd query gov proposal "$propnum" --output=json | jq -r .status)
    case $status in
      PROPOSAL_STATUS_PASSED)
        break
        ;;
      PROPOSAL_STATUS_REJECTED) ;;
      PROPOSAL_STATUS_FAILED)
        return 1
        ;;
      *)
        echo "waiting for proposal $propnum to pass (current status=$status)"
        ;;
    esac
    sleep 5
  done

  sleep 15 # wait for the new contract to be installed

  status=0
  bin/agops test upgrade-contract --from gov1 || status=$?
  if [ $status -eq 0 ]; then
    if $expect_wants; then
      echo "Expected wants, and got some"
    else
      echo "Expected no wants, but got some!"
      return 1
    fi
  elif [ $status -eq 2 ]; then
    if $expect_wants; then
      echo "Expected wants, but got none!"
      return 1
    else
      echo "Expected no wants, and got none"
    fi
  else
    exit $status # other failure
  fi
}

if [ "${1-init}" = init ]; then
  (cd "$PROPDIR" && agoric run "$ORIGDIR/test/upgrade-contract/propose-buggy-contract.js")
  enactCoreEval "$PROPDIR" false
fi

(cd "$PROPDIR2" && agoric run "$ORIGDIR/test/upgrade-contract/propose-upgrade-contract.js")
enactCoreEval "$PROPDIR2"
