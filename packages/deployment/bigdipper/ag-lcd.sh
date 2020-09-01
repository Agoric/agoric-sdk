#! /bin/bash
# ag-lcd.sh - run an Agoric Light Client Daemon
set -e
PATH=$PATH:/usr/local/bin
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

# FIXME: Once https://github.com/cosmos/cosmos-sdk/issues/5592 is resolved,
# we can use:
#exec ag-cosmos-helper rest-server --node="tcp://$rp" --chain-id="$cn"
exec ag-cosmos-helper rest-server --node="tcp://$rp" --trust-node
exit $?
