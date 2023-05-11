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
packages/inter-protocol/scripts/start-local-chain.sh
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
    PROPOSAL_STATUS_PASSED) break ;;
    *) echo "waiting for proposal $propnum to pass (current status=$status)" ;;
    esac
    sleep 5
  done
}

(cd "$PROPDIR" && agoric run "$ORIGDIR/test/propose-buggy-contract.js")
doTest "$PROPDIR"

(cd "$PROPDIR2" && agoric run "$ORIGDIR/test/propose-upgrade-contract.js")
doTest "$PROPDIR2"
