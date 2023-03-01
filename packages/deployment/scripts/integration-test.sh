#! /bin/bash
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export GOBIN="$thisdir/../../../golang/cosmos/build"
export NETWORK_NAME=${NETWORK_NAME-localtest}

SOLO_ADDR=
VAT_CONFIG=
RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}
mkdir -p "$RESULTSDIR"
pushd "$RESULTSDIR"
RESULTSDIR="$PWD"
popd

mkdir -p "$NETWORK_NAME/setup"
cd "$NETWORK_NAME/setup"


export AG_SETUP_COSMOS_HOME=${AG_SETUP_COSMOS_HOME-$PWD}
AGORIC_SDK_PATH=${AGORIC_SDK_PATH-$(cd "$thisdir/../../.." > /dev/null && pwd -P)}

if [ -d /usr/src/testnet-load-generator ]
then
  solodir=/usr/src/testnet-load-generator/_agstate/agoric-servers/testnet-8000
  "$thisdir/../../solo/bin/ag-solo" init "$solodir" --webport=8000
  SOLO_ADDR=$(cat "$solodir/ag-cosmos-helper-address")
  VAT_CONFIG="@agoric/vats/decentral-demo-config.json"
fi

# Speed up the docker deployment by pre-mounting /usr/src/agoric-sdk.
DOCKER_VOLUMES="$AGORIC_SDK_PATH:/usr/src/agoric-sdk" \
  "$thisdir/docker-deployment.cjs" > deployment.json

# Set up the network from our above deployment.json.
"$thisdir/setup.sh" init --noninteractive

# Go ahead and bootstrap with detailed debug logging.
AG_COSMOS_START_ARGS="--log_level=info --trace-store=.ag-chain-cosmos/data/kvstore-trace" \
VAULT_FACTORY_CONTROLLER_ADDR="$SOLO_ADDR" \
CHAIN_BOOTSTRAP_VAT_CONFIG="$VAT_CONFIG" \
XSNAP_TEST_RECORD=.ag-chain-cosmos/data/xsnap-trace \
SWING_STORE_TRACE=.ag-chain-cosmos/data/swingstore-trace \
XSNAP_KEEP_SNAPSHOTS=1 \
  "$thisdir/setup.sh" bootstrap ${1+"$@"}

if [ -d /usr/src/testnet-load-generator ]
then
  /usr/src/agoric-sdk/packages/deployment/scripts/setup.sh show-config > "$RESULTSDIR/network-config"
  cp ag-chain-cosmos/data/genesis.json "$RESULTSDIR/genesis.json"
  cp "$AG_SETUP_COSMOS_HOME/ag-chain-cosmos/data/genesis.json" "$RESULTSDIR/genesis.json"
  cd /usr/src/testnet-load-generator
  SOLO_COINS=40000000000uist \
    "$AG_SETUP_COSMOS_HOME/faucet-helper.sh" add-egress loadgen "$SOLO_ADDR"
  SLOGSENDER=@agoric/telemetry/src/otel-trace.js SOLO_SLOGSENDER= \
  SLOGSENDER_FAIL_ON_ERROR=1 SLOGSENDER_AGENT=process \
  SDK_BUILD=0 MUST_USE_PUBLISH_BUNDLE=1 SDK_SRC=/usr/src/agoric-sdk OUTPUT_DIR="$RESULTSDIR" ./start.sh \
    --stage.save-storage --trace kvstore swingstore xsnap \
    --stages=3 --stage.duration=10 --stage.loadgen.cycles=4 \
    --stage.loadgen.faucet.interval=6 --stage.loadgen.faucet.limit=4 \
    --profile=testnet "--testnet-origin=file://$RESULTSDIR" \
    --no-reset --custom-bootstrap
fi
