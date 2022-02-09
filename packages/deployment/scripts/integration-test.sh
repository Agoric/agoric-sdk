#! /bin/bash
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export NETWORK_NAME=${NETWORK_NAME-localtest}

RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}
mkdir -p "$RESULTSDIR"
pushd "$RESULTSDIR"
RESULTSDIR="$PWD"
popd

mkdir -p "$NETWORK_NAME/setup"
cd "$NETWORK_NAME/setup"

export AG_SETUP_COSMOS_HOME=${AG_SETUP_COSMOS_HOME-$PWD}

# Speed up the docker deployment by pre-mounting /usr/src/agoric-sdk.
DOCKER_VOLUMES="$(cd "$thisdir/../../.." > /dev/null && pwd -P):/usr/src/agoric-sdk" \
  "$thisdir/docker-deployment.cjs" > deployment.json

# Set up the network from our above deployment.json.
"$thisdir/setup.sh" init --noninteractive

# Go ahead and bootstrap with detailed debug logging.
AG_COSMOS_START_ARGS="--log_level=info --trace-store=.ag-chain-cosmos/data/kvstore.trace" \
  "$thisdir/setup.sh" bootstrap ${1+"$@"}

if [ -d /usr/src/testnet-load-generator ]
then
  /usr/src/agoric-sdk/packages/deployment/scripts/setup.sh show-config > "$RESULTSDIR/network-config"
  cp ag-chain-cosmos/data/genesis.json "$RESULTSDIR/genesis.json"
  cp "$AG_SETUP_COSMOS_HOME/ag-chain-cosmos/data/genesis.json" "$RESULTSDIR/genesis.json"
  cd /usr/src/testnet-load-generator
  $thisdir/../../solo/bin/ag-solo init \
    _agstate/agoric-servers/testnet-8000 \
    --webport=8000 \
    --netconfig="$RESULTSDIR/network-config"
  $AG_SETUP_COSMOS_HOME/faucet-helper.sh add-egress \
    loadgen $(cat _agstate/agoric-servers/testnet-8000/ag-cosmos-helper-address)
  SDK_BUILD=0 SDK_SRC=/usr/src/agoric-sdk OUTPUT_DIR="$RESULTSDIR" ./start.sh \
    --no-stage.save-storage --stages=3 --stage.duration=4 \
    --profile=testnet "--testnet-origin=file://$RESULTSDIR" \
    --no-reset
fi
