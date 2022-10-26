#!/bin/bash

# TODO make cross-platform https://stackoverflow.com/questions/52670836/standard-log-locations-for-a-cross-platform-application
mkdir -p ~/Library/Logs/Agoric
CHAIN_LOG=~/Library/Logs/Agoric/local-chain.log
touch "$CHAIN_LOG" || exit 1
open -a /System/Applications/Utilities/Console.app $CHAIN_LOG

# ugly way to get SDK path regardless of cwd
SDK=$(readlink -f "$(dirname -- "$(readlink -f -- "$0")")/../../..")

# Basically the psm config, plus priceAggregator and a different sourceSpec
export CHAIN_BOOTSTRAP_VAT_CONFIG="$SDK/packages/smart-wallet/scripts/start-local-chain-config.json"

WALLET=$1

if [ -z "$WALLET" ]; then
    echo "USAGE: $0 wallet-key"
    echo "You can reference by name: agd keys list"
    exit 1
fi

WALLET_BECH32=$(agd keys show "$WALLET" --output json | jq -r .address)

# grant econ governance
sed -i '' "s/\"voter\":.*/\"voter\": \"$WALLET_BECH32\"/" "$CHAIN_BOOTSTRAP_VAT_CONFIG"
# grant same key the priviledge of operating the demo oracle
# NB this assumes the current value, so won't update any others
sed -i '' "s/agoric1ersatz/$WALLET_BECH32/" "$CHAIN_BOOTSTRAP_VAT_CONFIG"

echo CHAIN_LOG $CHAIN_LOG
echo SDK "$SDK"
echo WALLET "$WALLET"
echo WALLET_BECH32 "$WALLET_BECH32"

# TODO detect it's already running, indicate when it started and offer to restart
# e.g. killall node xsnap-worker
echo "Starting the chain..."
cd "$SDK"/packages/cosmic-swingset || exit 1
make scenario2-setup scenario2-run-chain >>$CHAIN_LOG 2>&1 &
echo "Logs written to $CHAIN_LOG"
make wait-for-cosmos

echo "Funding the pool..."
make fund-provision-pool

echo "Funding your wallet account..."
# After `fund-provision-pool` there is 900 IST remaining for other account funding.
# A wallet can be tested with 20 BLD for provisioning wallet and 20 USDC for psm trading
make ACCT_ADDR="$WALLET_BECH32" FUNDS=20000000ubld,20000000ibc/usdc1234 fund-acct
agd query bank balances "$WALLET_BECH32" | grep ubld || exit 1

echo "Provisioning your smart wallet..."
agoric wallet provision --spend --account "$WALLET"
echo "waiting for blocks"
sleep 15
# verify
agoric wallet list
agoric wallet show --from "$WALLET"
