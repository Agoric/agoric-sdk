#! /bin/sh
set -xe
addr=$(cat t1/8000/ag-cosmos-helper-address)
opts=" --home=$PWD/t1/8000/ag-cosmos-helper-statedir --chain-id=agoric"
if test "$1" != poll; then
  cat >/tmp/s2.json <<\EOF
[[[1,"deliver:ro+1:getDemoBundle:rp-40;[\"client\"]"]],0]
EOF
  ag-cosmos-helper tx swingset deliver --keyring-backend=test $addr @/tmp/s2.json --gas=auto --gas-adjustment=1.05 --from=ag-solo -ojson --broadcast-mode=block --yes --output=json $opts
fi
ag-cosmos-helper query swingset mailbox $addr $opts
