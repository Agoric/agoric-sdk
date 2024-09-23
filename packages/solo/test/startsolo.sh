#! /bin/sh
set -e
PORT=${PORT-8000}
AG_SOLO=$(cd .. && pwd)/bin/ag-solo

TDIR="${TMPDIR-/tmp}/startsolo.$$"
trap 'rm -rf "$TDIR"' EXIT
"$AG_SOLO" init "$TDIR" --webport=$PORT --defaultManagerType=local
cd "$TDIR"
exec "$AG_SOLO" start
