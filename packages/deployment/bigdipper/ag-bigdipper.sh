#! /bin/bash
# bigdipper.sh - Run Agoric Big Dipper Explorer
set -e
ncf=`curl -Ss https://testnet.agoric.com/network-config`
l=`echo "$ncf" | jq '.rpcAddrs | length'`
eval rp=`echo "$ncf" | jq ".rpcAddrs[$(( RANDOM % l ))]"`
eval cn=`echo "$ncf" | jq '.chainName'`

case $cn in
testnet-1.16.8) db=meteor ;;
*) db=`echo "$cn" | sed -e 's/\./-/g'` ;;
esac

export MONGO_URL=mongodb://localhost:27017/"$db"

test -d "portal-$cn" && ln -sfT "portal-$cn" portal
cd portal
export METEOR_SETTINGS=`sed -e "s/@CHAIN_NAME@/$cn/; s/@RPC@/$rp/" settings.json`
exec /usr/bin/node main.js
exit $?
