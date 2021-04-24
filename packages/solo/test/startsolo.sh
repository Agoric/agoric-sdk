#! /bin/sh
set -e
PORT=${PORT-8000}
rm -rf t3
../bin/ag-solo init t3 --egresses=fake --webport=$PORT --defaultManagerType=local
cd t3
../../bin/ag-solo set-fake-chain --delay=0 mySimGCI
exec ../../bin/ag-solo start
