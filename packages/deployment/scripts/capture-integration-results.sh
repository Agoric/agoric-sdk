#! /bin/bash
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export NETWORK_NAME=${NETWORK_NAME-localtest}
export AG_SETUP_COSMOS_HOME=${AG_SETUP_COSMOS_HOME-"$PWD/$NETWORK_NAME/setup"}

RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}
mkdir -p "$RESULTSDIR"

home=/home/ag-chain-cosmos/.ag-chain-cosmos

for node in validator{0,1}; do
  "$thisdir/setup.sh" ssh "$node" cat "$home/config/genesis.json" > "$RESULTSDIR/$node-genesis.json" || true
  "$thisdir/setup.sh" ssh "$node" cat /var/log/journal/ag-chain-cosmos.service.log > "$RESULTSDIR/$node-journal.log" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/chain.slog" > "$RESULTSDIR/$node.slog" \
    || "$thisdir/setup.sh" ssh "$node" cat "$home/data/agoric/flight-recorder.bin" > "$RESULTSDIR/$node-flight-recorder.bin" || true
done
