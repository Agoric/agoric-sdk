#!/bin/sh

if [ -z "$AGORIC_NET" ]; then
  echo "AGORIC_NET env not set"
  echo
  echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
  echo
  echo "To test locally, AGORIC_NET=local and have the following running:
# freshen sdk
cd agoric-sdk
yarn install && yarn build

# (new tab)
# Start the chain
cd packages/cosmic-swingset
make scenario2-setup scenario2-run-chain-psm

# (new tab)
# Fund the pool (addr is a magic string)
make SOLO_COINS=1234000000ibc/usdc1234 ACCT_ADDR=agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 fund-acct
# Provision your wallet
cd packages/cosmic-swingset
# Copy the agoric address from your keplr wallet or 'agd keys list', starts with 'agoric1'
WALLET_ADDR=<yours>
make ACCT_ADDR=$WALLET_ADDR AGORIC_POWERS=SMART_WALLET fund-acct provision-acct
# verify
agoric wallet list
agoric wallet show --from $WALLET_ADDR
"
  exit 1
fi

KEY=$1

if [ -z "$KEY" ]; then
  echo "USAGE: $0 key"
  echo "You can reference by name: agd keys list"
  echo "Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/"
  exit 1
fi

set -x

# NB: fee percentages must be at least the governed param values

# perf test wantMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 >|"$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$KEY"

# perf test giveMinted
OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --giveMinted 0.01 --feePct 0.03 >|"$OFFER"
time bin/agops perf satisfaction --executeOffer "$OFFER" --from "$KEY"
