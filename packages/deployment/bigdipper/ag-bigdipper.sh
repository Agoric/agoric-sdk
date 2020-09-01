#! /bin/bash
# bigdipper.sh - Run Agoric Big Dipper Explorer
set -e
ncf=`curl -Ss https://testnet.agoric.com/network-config`
cn=`echo "$ncf" | jq -r '.chainName'`

origRpcAddrs=( $(echo $ncf | jq -r '.rpcAddrs | join(" ")' ) )

rpcAddrs=(${origRpcAddrs[@]})
rp=
while [[ ${#rpcAddrs[@]} -gt 0 ]]; do
  r=$(( $RANDOM % ${#rpcAddrs[@]} ))
  selected=${rpcAddrs[$r]}
  rpcAddrs=( ${rpcAddrs[@]/$selected} )

  if curl -s http://$selected/status > /dev/null; then
    # Found an active node.
    rp=$selected
    break
  fi
done

if test -z "$rp"; then
  echo "Cannot find an active node; last tried $selected"
  sleep 20
  exit 1
fi

case $cn in
testnet-1.16.8) db=meteor ;;
*) db=`echo "$cn" | sed -e 's/\./-/g'` ;;
esac

export MONGO_URL=mongodb://localhost:27017/"$db"
GTM=`cat google-tag-manager.txt || true`

test -d "portal-$cn" && ln -sfT "portal-$cn" portal
cd portal
export METEOR_SETTINGS=`sed -e "s/@GTM@/$GTM/; s/@CHAIN_NAME@/$cn/; s/@RPC@/$rp/" settings.json`
exec /usr/bin/node main.js
exit $?
