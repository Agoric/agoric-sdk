#! /bin/sh
set -e
PORT=${PORT-8000}
AG_SOLO=$(cd .. && pwd)/bin/ag-solo

TDIR="${TMPDIR-/tmp}/startsolo.$$"
trap 'rm -rf "$TDIR"' EXIT
"$AG_SOLO" init "$TDIR" --egresses=fake --webport=$PORT --defaultManagerType=local
cd "$TDIR"
"$AG_SOLO" set-fake-chain --delay=0 mySimGCI
exec "$AG_SOLO" start
