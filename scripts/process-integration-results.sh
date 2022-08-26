#! /bin/bash
set -ueo pipefail

[ "x${DEBUG-}" = "x1" -o "x${DEBUG-}" = "x2" ] && set -x

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

NETWORK_NAME=${NETWORK_NAME-localtest}
RESULTSDIR=${RESULTSDIR-"$NETWORK_NAME/results"}

[ $# -gt 0 ] && RESULTSDIR="$1"

clean_slog() {
  jq -cr 'del(.time, .monotime, .dr[2].timestamps, .memoryUsage, .heapStats, .statsTime)'
}

"$thisdir/process-integration-swingstore-traces.sh" "$RESULTSDIR"

# [ -f "$RESULTSDIR/divergent_snapshots" ] || exit 0

cd "$RESULTSDIR"

to_backup="divergent_snapshots divergent_snapshot_vats validator-swingstore-trace.diff"
to_delete=""

[ -f monitor-vs-validator-swingstore-trace.diff ] && to_backup="$to_backup monitor-vs-validator-swingstore-trace.diff"

# TODO: handle vat suspension (aka same vatID, multiple workers)
(mkdir -p validator0-xsnap-trace && cd $_ && tar -xzf ../$_.tgz && for v in *; do [ -d $v -a ! -h $v ] && ln -sf -T $v $(jq -r '.name | split(":") | .[0]' $v/00000-options.json) ; done; true)
(mkdir -p validator1-xsnap-trace && cd $_ && tar -xzf ../$_.tgz && for v in *; do [ -d $v -a ! -h $v ] && ln -sf -T $v $(jq -r '.name | split(":") | .[0]' $v/00000-options.json) ; done; true)
[ "x${DEBUG-}" = "x1" ] && set +x
for v in validator0-xsnap-trace/v*; do
  [ -d $v ] || continue
  for file in $v/*; do
    file2=validator1${file#validator0}
    [ ${file%-snapshot.dat} = $file -o ! -f $file2 ] && diff -U0 $file $file2 2>&1 || true
  done
done | grep -v "No newline at end of file" > validator-xsnap-trace.diff || true
[ "x${DEBUG-}" = "x1" ] && set -x
to_backup="$to_backup validator-xsnap-trace.diff"
to_delete="$to_delete validator0-xsnap-trace validator1-xsnap-trace"

for stage_trace in chain-stage-*-xsnap-trace.tgz; do
  [ -f "$stage_trace" ] || continue
  stage_trace=${stage_trace%".tgz"}
  mkdir -p $stage_trace
  to_delete="$to_delete $stage_trace"
  tar -xz -C "$stage_trace" -f "$stage_trace.tgz" || continue
  (cd $stage_trace && for v in *; do [ -d $v -a ! -h $v ] && ln -sf -T $v $(jq -r '.name | split(":") | .[0]' $v/00000-options.json) ; done; true)
done

[ "x${DEBUG-}" = "x1" ] && set +x
for v in validator0-xsnap-trace/v*; do
  v=${v#validator0-xsnap-trace/}
  i=1
  s=-1
  while true; do
    s=$(( s + 1 ))
    [ -d chain-stage-$s-xsnap-trace ] || break
    [ -d chain-stage-$s-xsnap-trace/$v ] || continue
    last_snapshot="$(echo chain-stage-$s-xsnap-trace/$v/*-snapshot.dat)"
    last_snapshot="${last_snapshot##* }"
    other_chain_trace=0
    ns=$s
    while true; do
      ns=$(( ns + 1 ))
      [ -d chain-stage-$ns-xsnap-trace ] || break
      if [ -d chain-stage-$ns-xsnap-trace/$v ]; then
        other_chain_trace=1
        break
      fi
    done
    if [ $other_chain_trace -eq 1 ]; then
      if [ -f $last_snapshot ]; then
        last_snapshot="${last_snapshot#chain-stage-$s-xsnap-trace/$v/}"
        last_snapshot="${last_snapshot%-snapshot.dat}"
        last_snapshot=$(( 10#$last_snapshot ))
      else
        continue
      fi
    else
      last_snapshot=999999
    fi
    j=$(jq -r 'if .snapshot == null then 1 else 2 end' chain-stage-$s-xsnap-trace/$v/00000-options.json)
    while [ $j -le $last_snapshot ]; do
      printf -v pi "%05d" $i
      file="$(echo validator0-xsnap-trace/$v/$pi-*)"
      file=${file##*/}
      [ -f validator0-xsnap-trace/$v/$file ] || break
      printf -v pj "%05d" $j
      file2="$(echo chain-stage-$s-xsnap-trace/$v/$pj-*)"
      file2=${file2##*/}
      [ -f chain-stage-$s-xsnap-trace/$v/$file2 ] || break
      [ ${file%-snapshot.dat} = $file -a ${file2%-snapshot.dat} = $file2 ] && diff -U0 validator0-xsnap-trace/$v/$file chain-stage-$s-xsnap-trace/$v/$file2 2>&1 || true
      i=$(( 1 + i ))
      j=$(( 1 + j ))
    done
  done
done | grep -v "No newline at end of file" > monitor-vs-validator-xsnap-trace.diff || true
[ "x${DEBUG-}" = "x1" ] && set -x
grep -e '^--- validator' <(cat validator-xsnap-trace.diff monitor-vs-validator-xsnap-trace.diff) | cut -d '/' -f 2 | uniq > divergent_xsnap_trace_vats || true

to_backup="$to_backup monitor-vs-validator-xsnap-trace.diff divergent_xsnap_trace_vats"

mkdir -p "xs-snapshots"
cp -a validator0-xs-snapshots/* "xs-snapshots/" || true
cp -a validator1-xs-snapshots/* "xs-snapshots/" || true
for s in chain-*-storage.tar.xz; do
  [ -f "$s" ] || continue
  tar -C "xs-snapshots/" -xJf $s --wildcards '**/xs-snapshots/*.gz' --transform='s/.*\///'
done
to_delete="$to_delete xs-snapshots"

snapshots=""
for trace in chain-*-swingstore-trace validator*-swingstore-trace; do
  [ -f "$trace" ] || continue
  snapshots_dir=${trace%"-swingstore-trace"}-snapshots
  mkdir -p $snapshots_dir
  to_delete="$to_delete $snapshots_dir"
  for v in $({ grep -E 'set local\.v[0-9]+\.lastSnapshot' $trace || true; } | cut -d ' ' -f 2 | cut -d '.' -f 2 | sort | uniq ); do
    mkdir -p $snapshots_dir/$v
    if grep -q -e "^$v\$" <(cat divergent_snapshot_vats divergent_xsnap_trace_vats); then
      to_backup="$to_backup $snapshots_dir/$v"
      v_divergent=1
    else
      v_divergent=0
    fi
    while read -r parsed; do
      set $parsed
      [ $v_divergent -eq 1 ] && snapshots="$snapshots $1"
      ln -sf -T ../../xs-snapshots/$1 $snapshots_dir/$v/$2
    done < <({ grep "set local.$v.lastSnapshot" $trace || true; } | \
      cut -d ' ' -f 3 | \
      jq -src '[.[] | [.startPos.itemCount, .snapshotID] ] | to_entries[] | [.value[1], " ", (1 + .key | tostring | length | if . >= 3 then "" else "0" * (3 - .) end), (1 + .key | tostring), "-", (.value[0] | tostring)] | join("")' \
    )
  done
done

gunzip -f xs-snapshots/*.gz || true
to_backup="$to_backup $(for h in $snapshots $(<divergent_snapshots); do
  [ -f xs-snapshots/$h ] && echo xs-snapshots/$h || true
done | sort | uniq)"

for trace in *-xsnap-trace; do
  [ -d "$trace" ] || continue
  snapshots_dir=${trace%"-xsnap-trace"}-snapshots
  for v in $trace/v*; do
    [ -h "$v" ] || continue
    v=${v#"$trace/"}
    if grep -q -e "^$v\$" <(cat divergent_snapshot_vats divergent_xsnap_trace_vats); then
      v_divergent=1
      to_backup="$to_backup $trace/$v $trace/$(readlink $trace/$v)"
    else
      v_divergent=0
    fi
    if [ -f $trace/$v/00000-options.json ]; then
      snapshot_tmp_file="$(jq -r '.snapshot | select (.!=null)' $trace/$v/00000-options.json)"
      snapshot_tmp_file="${snapshot_tmp_file##*/}"
      snapshot="${snapshot_tmp_file%%-*}"
      if [ ! -z "$snapshot_tmp_file" ]; then
        ln -sf -T $snapshot xs-snapshots/$snapshot_tmp_file
        [ $v_divergent -eq 1 ] && to_backup="$to_backup xs-snapshots/$snapshot_tmp_file"
      fi
    fi

    set $(echo $snapshots_dir/$v/*)
    for trace_command in $(echo $trace/$v/*-snapshot.dat); do
      [ -f $trace_command ] || continue
      [ $# -gt 0 ] || exit 1
      snapshot_tmp_file="$(<$trace_command)"
      snapshot_tmp_file="${snapshot_tmp_file##*/}"
      snapshot=$(readlink $1)
      snapshot="${snapshot##*/}"
      shift
      ln -sf -T $snapshot xs-snapshots/$snapshot_tmp_file
      [ $v_divergent -eq 1 ] && to_backup="$to_backup xs-snapshots/$snapshot_tmp_file"
    done
  done
done

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
