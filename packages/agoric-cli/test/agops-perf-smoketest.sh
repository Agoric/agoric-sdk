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
packages/inter-protocol/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY
"
  exit 1
fi

WALLET=$1

if [ -z "$WALLET" ]; then
  echo "USAGE: $0 key"
  echo "You can reference by name: agd keys list"
  echo "Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/"
  exit 1
fi

set -x

# NB: fee percentages must be at least the governed param values

# FIXME this one failing with: Error: cannot grab 10002ibc/toyellie coins: 0ibc/toyellie is smaller than 10002ibc/toyellie: insufficient funds
# perf test wantMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 >|"$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$WALLET"

# perf test giveMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --giveMinted 0.01 --feePct 0.03 >|"$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$WALLET"
