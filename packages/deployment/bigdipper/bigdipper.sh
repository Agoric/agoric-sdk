#! /bin/bash
# bigdipper.sh - Run Agoric Big Dipper Explorer

# Kill off all our children on exit.
trap 'kill $(jobs -p) 2>/dev/null' EXIT

NETWORK_URL=${1-"https://testnet.agoric.com"}
ncf=$(curl -Ss "$NETWORK_URL/network-config")
cn=$(echo "$ncf" | jq -r '.chainName')

origRpcAddrs=($(echo $ncf | jq -r '.rpcAddrs | join(" ")'))

# Begin detecting errors.
set -e

rpcAddrs=(${origRpcAddrs[@]})
rp=
while [[ ${#rpcAddrs[@]} -gt 0 ]]; do
  r=$(($RANDOM % ${#rpcAddrs[@]}))
  selected=${rpcAddrs[$r]}
  rpcAddrs=(${rpcAddrs[@]/$selected/})

  ping="curl -s http://$selected/status"
  if $ping > /dev/null; then
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

# Network name vs. database name.
nn=$(echo "$cn" | sed -e 's/-[0-9].*//')
db=$(echo "$cn" | sed -e 's/\./-/g')

export MONGO_URL=mongodb://localhost:27017/"$db"
GTM=$(cat google-tag-manager.txt || true)

api=$(echo "$rp" | sed -e 's/\:.*/:1317/')

test -d "portal-$cn" && ln -sfT "portal-$cn" "portal-$nn"
cd "portal-$nn"
export METEOR_SETTINGS=$(sed -e "s/@GTM@/$GTM/; s/@CHAIN_NAME@/$cn/; s!@NETWORK_URL@!$NETWORK_URL!; s/@RPC@/$rp/; s/@API@/$api/;" settings.json)

/usr/bin/node main.js &

# Kill this script if the ping fails.
# Systemd restarts us and we refresh our parameters.
{
  while $ping > /dev/null; do
    newcn=$(curl -Ss "$NETWORK_URL/network-config" | jq -r .chainName)
    test "$cn" == "$newcn" || break
    sleep 30
  done
  sleep 20
  kill $$
} &

wait
exit $?
