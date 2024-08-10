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

set -x

# NB: fee percentages must be at least the governed param values

# NOTE: USDC_axl = ibc/usdt1234
# perf test wantMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 --pair IST.USDC_axl >| "$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from gov1 --keyring-backend="test"

# perf test giveMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --giveMinted 0.01 --feePct 0.03 --pair IST.USDC_axl >| "$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from gov1 --keyring-backend="test"
