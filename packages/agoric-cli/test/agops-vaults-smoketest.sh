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

# open a vault
OFFER=$(mktemp -t agops.XXX)
bin/agops vaults open --wantMinted 5.00 --giveCollateral 9.0 >| "$OFFER"
agoric wallet print --file "$OFFER"
agoric wallet send --offer "$OFFER" --from gov1 --keyring-backend="test"

# list my vaults
bin/agops vaults list --from gov1 --keyring-backend="test"

# in another terminal watch:
agoric follow :published.vaultFactory.managers.manager0.vaults.vault0

# adjust
OFFER=$(mktemp -t agops.XXX)
bin/agops vaults adjust --vaultId vault0 --giveCollateral 1.0 --from gov1 --keyring-backend="test" >| "$OFFER"
agoric wallet print --file "$OFFER"
agoric wallet send --from gov1 --keyring-backend="test" --offer "$OFFER"

# close a vault
OFFER=$(mktemp -t agops.XXX)
# 5.05 for 5.00 debt plus 1% fee
bin/agops vaults close --vaultId vault0 --giveMinted 5.05 --from gov1 --keyring-backend="test" >| "$OFFER"
agoric wallet print --file "$OFFER"
agoric wallet send --from gov1 --keyring-backend="test" --offer "$OFFER"
