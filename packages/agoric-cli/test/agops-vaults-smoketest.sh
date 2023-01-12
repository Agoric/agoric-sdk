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

# Now run steps in agops-oracle-smoketest.sh so the priceAuthority has data to quote from,
# which is required for the maxDebtFor check that VM makes before opening a vault.

# open a vault
OFFER=$(mktemp -t agops.XXX)
bin/agops vaults open >|"$OFFER"
jq ".body | fromjson" <"$OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET" --offer "$OFFER"
