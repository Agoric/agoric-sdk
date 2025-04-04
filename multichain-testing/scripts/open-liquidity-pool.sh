#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias agoric-exec="kubectl exec -i agoriclocal-genesis-0 -c validator -- agd"
alias osmosis-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"

AGORIC_WALLET="test1"
AGORIC_ADDRESS=$(agoric-exec keys show ${AGORIC_WALLET} -a)
OSMOSIS_WALLET="test1"
OSMOSIS_ADDRESS=$(osmosis-exec keys show ${OSMOSIS_WALLET} -a)

AGORIC_OSMOSIS_CHANNEL="channel-0"
AGORIC_OSMOSIS_PORT="transfer"
AGORIC_TOKEN_DENOM="ubld"
AGORIC_TOKEN_AMOUNT="250000000000"

POOL_CONFIG_FILE="pool-config.json"
POOL_CONFIG_DEST="/opt/pool-config.json"

POOL_ASSET_1_DENOM="uosmo"
POOL_ASSET_1_AMOUNT="250000"
POOL_ASSET_1_WEIGHT="1"
POOL_ASSET_2_DENOM="ibc/E7827844CB818EE9C4DB2C159F1543FF62B26213B44CE8029D5CEFE52F0EE596"
POOL_ASSET_2_AMOUNT="250000"
POOL_ASSET_2_WEIGHT="1"
SWAP_FEE="0.01"
EXIT_FEE="0.00",
FUTURE_GOVERNOR=""

MAX_RETRIES="5"
DELAY="5"

echo "Generating pool configuration file ..."
jq -n \
  --arg weight1 "${POOL_ASSET_1_WEIGHT}${POOL_ASSET_1_DENOM}" \
  --arg weight2 "${POOL_ASSET_2_WEIGHT}${POOL_ASSET_2_DENOM}" \
  --arg amount1 "${POOL_ASSET_1_AMOUNT}${POOL_ASSET_1_DENOM}" \
  --arg amount2 "${POOL_ASSET_2_AMOUNT}${POOL_ASSET_2_DENOM}" \
  --arg swapFee "$SWAP_FEE" \
  --arg exitFee "$EXIT_FEE" \
  --arg futureGovernor "$FUTURE_GOVERNOR" \
  '{
    "weights": "\($weight1),\($weight2)",
    "initial-deposit": "\($amount1),\($amount2)",
    "swap-fee": $swapFee,
    "exit-fee": $exitFee,
    "future-governor": $futureGovernor
  }' > "$POOL_CONFIG_FILE"

echo "Verifying if Agoric wallet has enough funds ..."
agoric_balance_json=$(agoric-exec query bank balances $AGORIC_ADDRESS --denom $AGORIC_TOKEN_DENOM -o json)
agoric_balance=$(jq -r '.amount' <<< "$agoric_balance_json")

if [ "$agoric_balance" -le "$AGORIC_TOKEN_AMOUNT" ]; then
  echo "Balance is NOT sufficient. Exiting..."
  exit 1
fi

echo "Starting IBC transfer from Agoric to Osmosis ..."
agoric-exec tx ibc-transfer transfer $AGORIC_OSMOSIS_PORT $AGORIC_OSMOSIS_CHANNEL $OSMOSIS_ADDRESS ${AGORIC_TOKEN_AMOUNT}${AGORIC_TOKEN_DENOM} --from $AGORIC_ADDRESS --yes

echo "Verifying if Osmosis wallet has the funds ..."
for ((i = 1; i <= MAX_RETRIES; i++)); do
  echo "Attempt $i of $MAX_RETRIES..."

  osmosis_balances_json=$(osmosis-exec query bank balances $OSMOSIS_ADDRESS -o json)

  balance_1=$(jq -r --arg denom "$POOL_ASSET_1_DENOM" '.balances[] | select(.denom == $denom) | .amount' <<< "$osmosis_balances_json")
  balance_2=$(jq -r --arg denom "$POOL_ASSET_2_DENOM" '.balances[] | select(.denom == $denom) | .amount' <<< "$osmosis_balances_json")

  # If not found, treat as zero
  balance_1=${balance_1:-0}
  balance_2=${balance_2:-0}

  if [[ "$balance_1" -ge "$POOL_ASSET_1_AMOUNT" && "$balance_2" -ge "$POOL_ASSET_2_AMOUNT" ]]; then
    echo "Sufficient funds available."
    break
  fi

  if [[ $i -eq $MAX_RETRIES ]]; then
    echo "Insufficient funds after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "Waiting $DELAY seconds before retrying..."
  sleep $DELAY
done

# Record amount of existing pools before creating a new one
query_command='osmosis-exec query gamm num-pools -o json'
pool_count_json=$(eval "$query_command")
pool_count=$(jq -r '.num_pools' <<< "$pool_count_json")

echo "Copying pool configuration to Osmosis ..."
kubectl cp "${POOL_CONFIG_FILE}" osmosislocal-genesis-0:"${POOL_CONFIG_DEST}"

echo "Creating liquidity pool on Osmosis ..."
osmosis-exec tx gamm create-pool --pool-file $POOL_CONFIG_DEST --from $OSMOSIS_ADDRESS --chain-id osmosislocal --gas auto --gas-adjustment 1.2 --gas-prices=0.5uosmo --yes

echo "Verifying pool details ..."
for ((i = 1; i <= MAX_RETRIES; i++)); do
  current_pool_count_json=$(eval "$query_command")
  current_pool_count=$(jq -r '.num_pools' <<< "$current_pool_count_json")

  if [ "$current_pool_count" -gt "$pool_count" ]; then
    osmosis-exec query gamm pool $current_pool_count
    break
  fi

  if [[ $i -eq $MAX_RETRIES ]]; then
    echo "Pool not created after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "Waiting $DELAY seconds before retrying..."
  sleep $DELAY
done

echo "Liquidity Pool open successfully."
