#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias osmosis-cli="kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c"
alias osmosis-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"
alias agoric-exec="kubectl exec -i agoriclocal-genesis-0 -c validator -- agd"
alias hermes-exec="kubectl exec -i hermes-agoric-osmosis-0 -c relayer -- hermes"

AGORIC_WALLET="test1"
AGORIC_ADDRESS=$(agoric-exec keys show ${AGORIC_WALLET} -a)
OSMOSIS_WALLET="test1"
OSMOSIS_ADDRESS=$(osmosis-exec keys show ${OSMOSIS_WALLET} -a)
SWAPROUTER_OWNER_WALLET="genesis"
SWAPROUTER_OWNER_ADDRESS=$(osmosis-exec keys show ${SWAPROUTER_OWNER_WALLET} -a)

CHANNEL_INFO=$(hermes-exec --json query channels --show-counterparty --chain agoriclocal \
  | jq '[.][] | select(.result) | .result[] | select(.chain_id_b == "osmosislocal")')
AGORIC_OSMOSIS_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_a')
OSMOSIS_AGORIC_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_b')
AGORIC_OSMOSIS_PORT="transfer"

AGORIC_TOKEN_DENOM="$1"
AGORIC_TOKEN_TRANSFER_AMOUNT="250000000000"

IBC_DENOM=$(echo -n "$AGORIC_OSMOSIS_PORT/$OSMOSIS_AGORIC_CHANNEL/$AGORIC_TOKEN_DENOM" | shasum -a 256 | awk '{print toupper($1)}')

TOKEN_IN_DENOM="ibc/$IBC_DENOM"
TOKEN_IN_AMOUNT="$2"
TOKEN_IN_WEIGHT="$3"
TOKEN_OUT_DENOM="$4"
TOKEN_OUT_AMOUNT="$5"
TOKEN_OUT_WEIGHT="$6"
SWAP_FEE="0.01"
EXIT_FEE="0.00"
FUTURE_GOVERNOR=""

POOL_CONFIG_FILE="$AGORIC_TOKEN_DENOM-$TOKEN_OUT_DENOM-pool-config.json"
POOL_CONFIG_DEST="/opt/$POOL_CONFIG_FILE"

MAX_RETRIES="5"
DELAY="5"

echo "Generating pool configuration file ..."
jq -n \
  --arg weight1 "${TOKEN_IN_WEIGHT}${TOKEN_IN_DENOM}" \
  --arg weight2 "${TOKEN_OUT_WEIGHT}${TOKEN_OUT_DENOM}" \
  --arg amount1 "${TOKEN_IN_AMOUNT}${TOKEN_IN_DENOM}" \
  --arg amount2 "${TOKEN_OUT_AMOUNT}${TOKEN_OUT_DENOM}" \
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

if [ "$agoric_balance" -le "$AGORIC_TOKEN_TRANSFER_AMOUNT" ]; then
  echo "Balance is NOT sufficient. Exiting..."
  exit 1
fi

echo "Starting IBC transfer from Agoric to Osmosis ..."
agoric-exec tx ibc-transfer transfer $AGORIC_OSMOSIS_PORT $AGORIC_OSMOSIS_CHANNEL $OSMOSIS_ADDRESS ${AGORIC_TOKEN_TRANSFER_AMOUNT}${AGORIC_TOKEN_DENOM} --from $AGORIC_ADDRESS --yes

echo "Verifying if Osmosis wallet has the funds ..."
for ((i = 1; i <= MAX_RETRIES; i++)); do
  echo "Attempt $i of $MAX_RETRIES..."

  osmosis_balances_json=$(osmosis-exec query bank balances $OSMOSIS_ADDRESS -o json)

  balance_1=$(jq -r --arg denom "$TOKEN_IN_DENOM" '.balances[] | select(.denom == $denom) | .amount' <<< "$osmosis_balances_json")
  balance_2=$(jq -r --arg denom "$TOKEN_OUT_DENOM" '.balances[] | select(.denom == $denom) | .amount' <<< "$osmosis_balances_json")

  # If not found, treat as zero
  balance_1=${balance_1:-0}
  balance_2=${balance_2:-0}

  if [[ "$balance_1" -ge "$TOKEN_IN_AMOUNT" && "$balance_2" -ge "$TOKEN_OUT_AMOUNT" ]]; then
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
    pool_info=$(osmosis-exec query gamm pool $current_pool_count)
    break
  fi

  if [[ $i -eq $MAX_RETRIES ]]; then
    echo "Pool not created after $MAX_RETRIES attempts."
    exit 1
  fi

  echo "Waiting $DELAY seconds before retrying..."
  sleep $DELAY
done

SWAPROUTER_ADDRESS=$(osmosis-cli "jq -r '.swaprouter.address' /contract-info.json")
POOL_ID=$(jq -r '.pool | .id' <<< "$pool_info")

SET_ROUTE_JSON=$(jq -n \
  --arg tokenIn "$TOKEN_IN_DENOM" \
  --arg tokenOut "$TOKEN_OUT_DENOM" \
  --arg poolId "$POOL_ID" \
  '{
    set_route: {
      input_denom: $tokenIn,
      output_denom: $tokenOut,
      pool_route: [
        {
          pool_id: $poolId,
          token_out_denom: $tokenOut
        }
      ]
    }
  }')

GET_ROUTE_JSON=$(jq -n \
  --arg tokenIn "$TOKEN_IN_DENOM" \
  --arg tokenOut "$TOKEN_OUT_DENOM" \
  '{
  "get_route": {
    "input_denom": $tokenIn,
    "output_denom": $tokenOut
  }
}')

echo "Storing pool on swaprouter contract ..."
osmosis-exec tx wasm execute "$SWAPROUTER_ADDRESS" "$SET_ROUTE_JSON" --from "$SWAPROUTER_OWNER_ADDRESS" --chain-id osmosislocal --yes --fees 1000uosmo

echo "Querying pool route ..."
(
  set +e # handle failure of "osmosis-exec query wasm contract-state smart"

  for ((i = 1; i <= MAX_RETRIES; i++)); do
    echo "Attempt $i of $MAX_RETRIES..."
    pool_route_json=$(osmosis-exec query wasm contract-state smart "$SWAPROUTER_ADDRESS" "$GET_ROUTE_JSON" 2> /dev/null)

    if [[ $? -eq 0 ]]; then
      echo "Pool route found:"
      echo "$pool_route_json"
      break
    fi

    if [[ $i -eq MAX_RETRIES ]]; then
      echo "Pool not stored after $MAX_RETRIES attempts."
      exit 1
    fi

    echo "Query failed. Waiting $DELAY seconds before retrying..."
    sleep "$DELAY"
  done
)

echo "Liquidity Pool open and stored on swaprouter successfully."

SET_REVERSE_ROUTE_JSON=$(jq -n \
  --arg tokenIn "$TOKEN_OUT_DENOM" \
  --arg tokenOut "$TOKEN_IN_DENOM" \
  --arg poolId "$POOL_ID" \
  '{
    set_route: {
      input_denom: $tokenIn,
      output_denom: $tokenOut,
      pool_route: [
        {
          pool_id: $poolId,
          token_out_denom: $tokenOut
        }
      ]
    }
  }')

GET_REVERSE_ROUTE_JSON=$(jq -n \
  --arg tokenIn "$TOKEN_OUT_DENOM" \
  --arg tokenOut "$TOKEN_IN_DENOM" \
  '{
  "get_route": {
    "input_denom": $tokenIn,
    "output_denom": $tokenOut
  }
}')

echo "Storing reverse pool on swaprouter contract ..."
osmosis-exec tx wasm execute "$SWAPROUTER_ADDRESS" "$SET_REVERSE_ROUTE_JSON" --from "$SWAPROUTER_OWNER_ADDRESS" --chain-id osmosislocal --yes --fees 1000uosmo

echo "Querying reverse pool route ..."
(
  set +e # handle failure of "osmosis-exec query wasm contract-state smart"

  for ((i = 1; i <= MAX_RETRIES; i++)); do
    echo "Attempt $i of $MAX_RETRIES..."
    pool_route_json=$(osmosis-exec query wasm contract-state smart "$SWAPROUTER_ADDRESS" "$GET_REVERSE_ROUTE_JSON" 2> /dev/null)

    if [[ $? -eq 0 ]]; then
      echo "Pool route found:"
      echo "$pool_route_json"
      break
    fi

    if [[ $i -eq MAX_RETRIES ]]; then
      echo "Pool not stored after $MAX_RETRIES attempts."
      exit 1
    fi

    echo "Query failed. Waiting $DELAY seconds before retrying..."
    sleep "$DELAY"
  done
)

echo "Reverse liquidity Pool open and stored on swaprouter successfully."
