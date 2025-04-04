#!/bin/bash

set -euo pipefail

AGORIC_TEST1=agoric1elueec97as0uwavlxpmj75u5w7yq9dgphq47zx
OSMOSIS_TEST1=osmo1pss7nxeh3f9md2vuxku8q99femnwdjtc8ws4un
AGORIC_OSMOSIS_CHANNEL=channel-0
AGORIC_OSMOSIS_PORT=transfer
AMOUNT=250000000000
DENOM=ubld
POOL_CONFIG_FILE=pool-config.json
POOL_CONFIG_DEST=/opt/pool-config.json


echo "Verifying if Agoric wallet has enough funds ..."
balance_json=$(kubectl exec -it agoriclocal-genesis-0 -- /bin/bash -c "agd q bank balances ${AGORIC_TEST1} --denom ${DENOM} -o json")
balance=$(jq -r '.amount' <<< "$balance_json")

if [ "$balance" -le "$AMOUNT" ]; then
    echo "Balance is NOT sufficient. Exiting..."
    exit 1
fi

echo "Starting IBC transfer from Agoric to Osmosis ..."
kubectl exec -it agoriclocal-genesis-0 -- /bin/bash -c \
"agd tx ibc-transfer transfer ${AGORIC_OSMOSIS_PORT} ${AGORIC_OSMOSIS_CHANNEL} ${OSMOSIS_TEST1} ${AMOUNT}${DENOM} --from ${AGORIC_TEST1} --yes"

sleep 1

echo "Copying pool configuration to Osmosis ..."
kubectl cp "${POOL_CONFIG_FILE}" osmosislocal-genesis-0:"${POOL_CONFIG_DEST}"

echo "Creating liquidity pool on Osmosis ..."
kubectl exec -it osmosislocal-genesis-0 -- /bin/bash -c \
"osmosisd tx gamm create-pool --pool-file ${POOL_CONFIG_DEST} --from ${OSMOSIS_TEST1} --chain-id osmosislocal --gas auto --gas-adjustment 1.2 --gas-prices=0.5uosmo --yes"

sleep 1

echo "Querying pool details ..."
pool_count_json=$(kubectl exec -it osmosislocal-genesis-0 -- /bin/bash -c "osmosisd query gamm num-pools -o json") 
pool_count=$(jq -r '.num_pools' <<< "$pool_count_json")

kubectl exec -it osmosislocal-genesis-0 -- /bin/bash -c "osmosisd query gamm pool ${pool_count} " 

echo "Liquidity Pool open successfully."
