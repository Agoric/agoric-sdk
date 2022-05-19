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
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/swingstore-trace" > "$RESULTSDIR/$node-swingstore-trace" || true
done

ret=0
"$thisdir/../../../scripts/process-integration-swingstore-traces.sh" "$RESULTSDIR" || ret=$?

failedtest=${1:-"unknown"}

if [ -f "$RESULTSDIR/divergent_snapshots" ]; then
  if [ -s "$RESULTSDIR/validator-swingstore-trace.diff" ]; then
    cat "$RESULTSDIR/validator-swingstore-trace.diff" | cut -c -80 || true
    echo "Error: Swingstore trace mismatch between validators"
  fi

  if [ -f "$RESULTSDIR/monitor-vs-validator-swingstore-trace.diff" ] && \
     [ -s "$RESULTSDIR/monitor-vs-validator-swingstore-trace.diff" ]
  then
    cat "$RESULTSDIR/monitor-vs-validator-swingstore-trace.diff" | cut -c -80 || true
    echo "Error: Swingstore trace mismatch between loadgen monitor and validators"
  fi

  # Snapshot divergences were found, fail the test after capturing results
  # TODO: uncomment once transient divergences are solved
  # ret=1
elif [ $ret -eq 0 -a "$failedtest" = "false" ]; then 
  echo "Successful test"
  exit 0
fi

for node in validator{0,1}; do
  "$thisdir/setup.sh" ssh "$node" cat "$home/config/genesis.json" > "$RESULTSDIR/$node-genesis.json" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/chain.slog" > "$RESULTSDIR/$node.slog" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/ag-cosmos-chain-state/flight-recorder.bin" > "$RESULTSDIR/$node-flight-recorder.bin" || true
  "$thisdir/setup.sh" ssh "$node" cat "$home/data/kvstore-trace" > "$RESULTSDIR/$node-kvstore-trace" || true
  "$thisdir/setup.sh" ssh "$node" tar -cz -C "$home/data/xsnap-trace" . > "$RESULTSDIR/$node-xsnap-trace.tgz" || true
  mkdir -p "$RESULTSDIR/$node-xs-snapshots" && "$thisdir/setup.sh" ssh "$node" tar -c -C "$home/data/ag-cosmos-chain-state/xs-snapshots" . | tar -x -C "$RESULTSDIR/$node-xs-snapshots" || true
done

for trace in $RESULTSDIR/chain-stage-*-xsnap-trace $RESULTSDIR/client-stage-*-xsnap-trace; do
  [ -d "$trace" ] || continue
  tar -cz -C "$trace" -f "$trace.tgz" . || continue
  rm -rf "$trace" || true
done

exit $ret