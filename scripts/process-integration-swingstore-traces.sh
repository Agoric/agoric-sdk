#! /bin/bash
set -ueo pipefail

[ "x${DEBUG-}" = "x1" -o "x${DEBUG-}" = "x2" ] && set -x

NETWORK_NAME=${NETWORK_NAME-localtest}
RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}

[ $# -gt 0 ] && RESULTSDIR="$1"

get_trace_len() {
  grep -n commit-tx $1 | tail -1 | cut -d : -f 1 || cat $1 | wc -l || echo 0
}

get_vats_from_diff() {
  grep 'set local\.v' $1 | cut -d . -f 2 | sort | uniq || true
}

get_snapshots_from_diff() {
  grep 'set local\.snapshot\.' $1 | cut -d ' ' -f 2 | cut -d . -f 3 | sort | uniq || true
}

val0len=$(get_trace_len $RESULTSDIR/validator0-swingstore-trace)
val1len=$(get_trace_len $RESULTSDIR/validator1-swingstore-trace)
commonlen=$((val0len < val1len ? val0len : val1len))

[ $commonlen -eq 0 ] && exit 0

val_diff_ret=0
diff -U0 <(head -n $commonlen $RESULTSDIR/validator0-swingstore-trace) <(head -n $commonlen $RESULTSDIR/validator1-swingstore-trace) > $RESULTSDIR/validator-swingstore-trace.diff || val_diff_ret=$?
diffs=$RESULTSDIR/validator-swingstore-trace.diff

chain_diff_ret=0
if [ -f $RESULTSDIR/chain-stage-0-swingstore-trace ] ; then
  chain0len=$(get_trace_len $RESULTSDIR/chain-stage-0-swingstore-trace)
  chain1len=0
  chain1trace=$RESULTSDIR/chain-stage-1-swingstore-trace
  if [ -f $chain1trace ]; then
    chain1len=$(get_trace_len $RESULTSDIR/chain-stage-1-swingstore-trace)
  else
    chain1trace=/dev/null
  fi
  chainlen=$((chain0len + chain1len))
  
  diff -U0 -I 'set cosmos/meta .*' -I 'set host\..*' <(head -n $chainlen $RESULTSDIR/validator0-swingstore-trace) <(cat <(head -n $chain0len $RESULTSDIR/chain-stage-0-swingstore-trace) <(head -n $chain1len $chain1trace)) > $RESULTSDIR/monitor-vs-validator-swingstore-trace.diff || chain_diff_ret=$?
  diffs="$diffs $RESULTSDIR/monitor-vs-validator-swingstore-trace.diff"
fi

# [ $val_diff_ret -eq 0 -a $chain_diff_ret -eq 0 ] && exit 0

get_snapshots_from_diff <(cat $diffs) > $RESULTSDIR/divergent_snapshots
get_vats_from_diff <(cat $diffs) > $RESULTSDIR/divergent_snapshot_vats
