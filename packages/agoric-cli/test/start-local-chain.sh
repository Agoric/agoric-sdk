#!/bin/bash
#
# Start a chain with "economy" and provision wallet to use it
#

# run an Archive node to keep all history https://docs.desmos.network/fullnode/overview/
# (the Makefile passes this to agd start)
export AGC_START_ARGS="--pruning=nothing"

CHAIN_LOG=$(mktemp -t Agoric-start-local-chain-log-XXXXXXX)
if [[ $(uname) == "Darwin" ]]; then
  open -a /System/Applications/Utilities/Console.app "$CHAIN_LOG"
fi

# ugly way to get SDK path regardless of cwd
SDK=$(readlink -f "$(dirname -- "$(readlink -f -- "$0")")/../../..")

WALLET=gov1
WALLET_BECH32=$(agd keys --keyring-backend=test show "$WALLET" --output json | jq -r .address)

if [ -z "$WALLET_BECH32" ]; then
  echo "USAGE: $0 wallet-key"
  # The key must be from the 'test' keyring, for non-interactive use.
  # To migrate one of your 'os' keys:
  #   agd keys export the-wallet-key-name > wallet.key
  #   agd keys import --keyring-backend=test the-wallet-key-name wallet.key
  exit 1
fi

# this is in economy-template.json in the oracleAddresses list (agoric1dy0yegdsev4xvce3dx7zrz2ad9pesf5svzud6y)
# to use it run `agd keys --keyring-backend=test add oracle2 --interactive` and enter this mnenomic:
# dizzy scale gentle good play scene certain acquire approve alarm retreat recycle inch journey fitness grass minimum learn funny way unlock what buzz upon
WALLET2=gov2
WALLET2_BECH32=$(agd keys --keyring-backend=test show "$WALLET2" --output json | jq -r .address)
if [ -z "$WALLET2_BECH32" ]; then
  echo "missing oracle2 key in test keyring"
  exit 1
fi

echo CHAIN_LOG "$CHAIN_LOG"
echo SDK "$SDK"
echo WALLET "$WALLET"
echo WALLET_BECH32 "$WALLET_BECH32"

cd "$SDK"/packages/cosmic-swingset || exit 1

echo "Logs written to $CHAIN_LOG"
# specifies the address to use for chain config
export PRIMARY_ADDRESS=$WALLET_BECH32
# nobuild variety skips Golang artifacts; if you get errors try make scenario2-setup
make scenario2-setup-nobuild >> "$CHAIN_LOG" 2>&1

# TODO detect it's already running, indicate when it started and offer to restart
# e.g. killall node xsnap-worker
echo "Starting the chain..."
# use -economy target to get the kitchen sink
# disable pruning to keep all history https://docs.desmos.network/fullnode/overview/
make AGC_START_ARGS="--pruning=nothing" CHAIN_BOOTSTRAP_VAT_CONFIG=@agoric/vm-config/decentral-itest-vaults-config.json scenario2-run-chain >> "$CHAIN_LOG" 2>&1 &
make wait-for-cosmos

# xxx sleep to let it settle
sleep 15

echo "Funding the pool..."
make fund-provision-pool

echo "Funding your wallet account..."
# After `fund-provision-pool` there is 900 IST remaining for other account funding.
# A wallet can be tested with 20 BLD for provisioning wallet and 20 USDC for psm trading
# Also include 1M ATOM
make ACCT_ADDR="$WALLET_BECH32" FUNDS=20000000ubld,20000000ibc/toyusdc,1000000000000ibc/toyatom fund-acct
agd query bank balances "$WALLET_BECH32" | grep ubld || exit 1

echo "Provisioning your smart wallet..."
agoric wallet --keyring-backend=test provision --spend --account "$WALLET"
echo "waiting for blocks"
sleep 15
# verify
agoric wallet --keyring-backend=test list
agoric wallet --keyring-backend=test show --from "$WALLET"

echo "Repeating for gov2 account..."
make ACCT_ADDR="$WALLET2_BECH32" FUNDS=20000000ubld,20000000ibc/toyusdc fund-acct
agoric wallet --keyring-backend=test provision --spend --account "$WALLET2"
