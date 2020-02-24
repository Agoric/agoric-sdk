#! /bin/bash
# ag-lcd.sh - run an Agoric Light Client Daemon
set -e
PATH=$PATH:/usr/local/bin
ncf=`curl -Ss https://testnet.agoric.com/network-config`
l=`echo "$ncf" | jq '.rpcAddrs | length'`
eval rp=`echo "$ncf" | jq ".rpcAddrs[$(( RANDOM % l ))]"`
eval cn=`echo "$ncf" | jq '.chainName'`
# FIXME: Once https://github.com/cosmos/cosmos-sdk/issues/5592 is resolved,
# we can use:
#exec ag-cosmos-helper rest-server --node="tcp://$rp" --chain-id="$cn"
exec ag-cosmos-helper rest-server --node="tcp://$rp" --trust-node
exit $?
