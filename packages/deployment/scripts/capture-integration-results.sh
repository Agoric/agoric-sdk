#! /bin/bash
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export NETWORK_NAME=${NETWORK_NAME-localtest}
export AG_SETUP_COSMOS_HOME=${AG_SETUP_COSMOS_HOME-"$PWD/$NETWORK_NAME/setup"}

RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}
mkdir -p "$RESULTSDIR"

for node in validator{0,1}; do
  home=/home/ag-chain-cosmos/.ag-chain-cosmos
  "$thisdir/setup.sh" ssh "$node" cat "$home/config/genesis.json" > "$RESULTSDIR/$node-genesis.json" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/chain.slog" > "$RESULTSDIR/$node.slog" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/ag-cosmos-chain-state/flight-recorder.bin" > "$RESULTSDIR/$node-flight-recorder.bin" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/kvstore.trace" > "$RESULTSDIR/$node-kvstore.trace" || true
  "$thisdir/setup.sh" ssh "$node" tar -cz "$home/data/xsnap-record" > "$RESULTSDIR/$node-xsnap-record.tgz" || true
  "$thisdir/setup.sh" ssh "$node" tar -c "$home/data/ag-cosmos-chain-state/xs-snapshots" > "$RESULTSDIR/$node-xs-snapshots.tar" || true
done

if [ -d /usr/src/testnet-load-generator ]
then
  tar -cf "$RESULTSDIR/chain-xs-snapshots.tar" ~/.ag-chain-cosmos/data/ag-cosmos-chain-state/xs-snapshots
fi