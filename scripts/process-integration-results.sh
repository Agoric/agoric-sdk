#! /bin/bash
set -ueo pipefail

[ "x${DEBUG-}" = "x1" -o "x${DEBUG-}" = "x2" ] && set -x

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

NETWORK_NAME=${NETWORK_NAME-localtest}
RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}

[ $# -gt 0 ] && RESULTSDIR="$1"

clean_slog() {
  jq -cr 'del(.time, .monotime, .dr[2].timestamps, .memoryUsage, .heapStats, .statsTime, .compressSeconds, .rawSaveSeconds, .dbSaveSeconds)'
}

cd "$RESULTSDIR"

to_backup=""
to_delete=""

diff <(cat validator0.slog | clean_slog) <(cat validator1.slog | clean_slog) > validator-slog.diff || true
to_backup="$to_backup validator-slog.diff"

if [ -f chain-stage-0.slog.gz ]; then
  zcat chain-stage-0.slog.gz > chain-stage-0.slog || true
  to_delete="$to_delete chain-stage-0.slog"
  chain_slog_len=$(cat chain-stage-0.slog | wc -l)
  diff <(head -n $chain_slog_len validator0.slog | clean_slog) <(cat chain-stage-0.slog | clean_slog) > monitor-stage-0-vs-validator-slog.diff || true
  to_backup="$to_backup monitor-stage-0-vs-validator-slog.diff"
fi

tar -czf divergent_traces.tgz $to_backup
[ "x${DEBUG-}" = "x2" ] || rm -rf $to_delete
