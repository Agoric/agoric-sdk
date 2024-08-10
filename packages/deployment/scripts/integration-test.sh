#! /bin/bash
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export GOBIN="$thisdir/../../../golang/cosmos/build"
export NETWORK_NAME=${NETWORK_NAME-localtest}

SDK_SRC=${SDK_SRC-$(cd "$thisdir/../../.." > /dev/null && pwd -P)}

LOADGEN=${LOADGEN-""}
if [ -z "$LOADGEN" ] || [ "x$LOADGEN" = "x1" ]; then
  for dir in "$SDK_SRC/../testnet-load-generator" /usr/src/testnet-load-generator; do
    if [ -d "$dir" ]; then
      LOADGEN="$dir"
      break
    fi
  done
fi

if [ -d "$LOADGEN" ]; then
  # Get the absolute path.
  LOADGEN=$(cd "$LOADGEN" > /dev/null && pwd -P)
elif [ -n "$LOADGEN" ]; then
  echo "Cannot find loadgen (\$LOADGEN=$LOADGEN)" >&2
  exit 2
else
  echo "Running chain without loadgen" >&2
fi

set -x

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
export AG_SETUP_COSMOS_STATE_SYNC_INTERVAL=20

if [ -n "$LOADGEN" ]; then
  solodir="$LOADGEN"/_agstate/agoric-servers/testnet-8000
  "$thisdir/../../solo/bin/ag-solo" init "$solodir" --webport=8000
  SOLO_ADDR=$(cat "$solodir/ag-cosmos-helper-address")
  VAT_CONFIG="@agoric/vm-config/decentral-demo-config.json"
fi

"$thisdir/docker-deployment.cjs" > deployment.json

# Set up the network from our above deployment.json.
"$thisdir/setup.sh" init --noninteractive

# Go ahead and bootstrap with detailed debug logging.
AG_COSMOS_START_ARGS="--log_level=info" \
  VAULT_FACTORY_CONTROLLER_ADDR="$SOLO_ADDR" \
  CHAIN_BOOTSTRAP_VAT_CONFIG="$VAT_CONFIG" \
  "$thisdir/setup.sh" bootstrap ${1+"$@"}

if [ -n "$LOADGEN" ]; then
  "$SDK_SRC/packages/deployment/scripts/setup.sh" show-config > "$RESULTSDIR/network-config"
  cp ag-chain-cosmos/data/genesis.json "$RESULTSDIR/genesis.json"
  cp "$AG_SETUP_COSMOS_HOME/ag-chain-cosmos/data/genesis.json" "$RESULTSDIR/genesis.json"
  cd "$LOADGEN"
  SOLO_COINS=40000000000uist PATH="$thisdir/../bin:$SDK_SRC/bin:$PATH" \
    "$AG_SETUP_COSMOS_HOME/faucet-helper.sh" add-egress loadgen "$SOLO_ADDR"
  SLOGSENDER=@agoric/telemetry/src/otel-trace.js SOLO_SLOGSENDER="" \
    SLOGSENDER_FAIL_ON_ERROR=1 SLOGSENDER_AGENT=process \
    AG_CHAIN_COSMOS_HOME=$HOME/.agoric \
    SDK_BUILD=0 MUST_USE_PUBLISH_BUNDLE=1 SDK_SRC=$SDK_SRC OUTPUT_DIR="$RESULTSDIR" ./start.sh \
    --no-stage.save-storage \
    --stages=3 --stage.duration=10 --stage.loadgen.cycles=4 \
    --stage.loadgen.faucet.interval=6 --stage.loadgen.faucet.limit=4 \
    --profile=testnet "--testnet-origin=file://$RESULTSDIR" --use-state-sync \
    --no-reset --custom-bootstrap
fi
