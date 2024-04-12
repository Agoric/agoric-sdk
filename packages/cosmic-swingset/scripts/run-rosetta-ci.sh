#!/bin/bash
set -e
trap 'kill $(jobs -p)' EXIT

# Start the faucet
CHAIN_ID="agoriclocal"
CHAIN_RPC_NODE="http://127.0.0.1:26657"
KEYRING_DIR="$PWD/t1/bootstrap/"
FAUCET_WALLET="bootstrap"
FAUCET_ADDRESS="127.0.0.1"
FAUCET_PORT=7000

python3 ./scripts/faucet.py --chain-id "${CHAIN_ID}" \
  --chain-data "${KEYRING_DIR}" \
  --wallet "${FAUCET_WALLET}" \
  --rpc "${CHAIN_RPC_NODE}" \
  --faucet-address "${FAUCET_ADDRESS}" \
  --faucet-port "${FAUCET_PORT}" &

echo "check rosetta-cli is installed"
if [ ! -x ./bin/rosetta-cli ]; then
  # Installs rosetta-cli into the local ./bin directory
  # https://github.com/coinbase/rosetta-cli#installation
  curl -sSfL https://raw.githubusercontent.com/coinbase/rosetta-cli/v0.10.3/scripts/install.sh | sh -s
fi

echo "checking data API"
./bin/rosetta-cli check:data --start-block 18 --configuration-file rosetta.json

echo "checking construction API"
./bin/rosetta-cli check:construction --configuration-file rosetta.json
