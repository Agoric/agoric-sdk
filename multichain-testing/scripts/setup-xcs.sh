#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias osmo-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"
alias osmo-cli="kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c"

OSMOSIS_BRANCH="$1"

RPC=http://localhost:26655
TX_FLAGS="--keyring-backend=test --gas=auto --gas-prices 0.1uosmo --gas-adjustment 1.3 --yes --chain-id osmosislocal"
OWNER=genesis
OWNER_ADDRESS=$(osmo-exec keys show genesis -a)
CONTRACT_INFO_HEX=636F6E74726163745F696E666F

COMMON_INSTANTIATE_MSG="{\"owner\": \"$OWNER_ADDRESS\"}"

wait_for_blocks() {
  local num_blocks="$1"
  local rpc="${2:-$RPC}"

  echo "Fetching current height from $rpc..."

  local start_height
  start_height=$(curl -s "$rpc/status" | jq -r '.result.sync_info.latest_block_height')

  if [[ -z "$start_height" || "$start_height" == "null" ]]; then
    echo "Failed to fetch block height"
    return 1
  fi

  local target_height=$((start_height + num_blocks))
  echo "Waiting for $num_blocks blocks... (target: $target_height)"

  while true; do
    local current_height
    current_height=$(curl -s "$rpc/status" | jq -r '.result.sync_info.latest_block_height')

    if [[ "$current_height" -ge "$target_height" ]]; then
      echo "Reached target height: $current_height"
      break
    else
      echo "Current height: $current_height — waiting..."
      sleep 2
    fi
  done
}

check_data_not_null() {
  local json="$1"
  local error_message="${2:-'data is null'}"

  local data
  data=$(echo "$json" | jq -r '.data')

  if [[ "$data" == "null" ]]; then
    echo "$error_message"
    exit 1
  else
    echo "contract initiated successfully: $(echo $data | base64 -d)"
  fi
}

echo "Prepare download script inside osmosislocal-genesis-0 pod so that we can deploy wasm contracts..."
cat ./scripts/download-wasm-artifacts.sh | osmo-cli "tee /download-wasm-artifacts.sh > /dev/null"

echo "Set newly created file's permissions..."
osmo-cli "chmod 755 /download-wasm-artifacts.sh"

# Pass branch as argument TODO
echo "Download artifacts for XCS..."
osmo-cli "/download-wasm-artifacts.sh osmosis-labs osmosis $OSMOSIS_BRANCH tests/ibc-hooks/bytecode /wasm-artifacts crosschain_swaps.wasm swaprouter.wasm crosschain_registry.wasm"

echo "Storing Swaprouter code..."
osmo-exec tx wasm store /wasm-artifacts/swaprouter.wasm --from $OWNER $TX_FLAGS
wait_for_blocks 5

SWAPROUTER_CODE_ID=$(osmo-exec query wasm list-code -o json | jq -r '.code_infos[-1].code_id')

echo "Instantiating Swaprouter..."
osmo-exec tx wasm instantiate "$SWAPROUTER_CODE_ID" "$COMMON_INSTANTIATE_MSG" --from $OWNER --label swaprouter --admin $OWNER_ADDRESS $TX_FLAGS
wait_for_blocks 5

SWAPROUTER_ADDRESS=$(osmo-exec query wasm list-contract-by-code "$SWAPROUTER_CODE_ID" -o json | jq -r '.contracts | [last][0]')
echo "Swaprouter address: $SWAPROUTER_ADDRESS"

echo "Storing Crosschain Registry code..."
osmo-exec tx wasm store /wasm-artifacts/crosschain_registry.wasm --from $OWNER $TX_FLAGS
wait_for_blocks 5
CROSSCHAIN_REGISTRY_CODE_ID=$(osmo-exec query wasm list-code -o json | jq -r '.code_infos[-1].code_id')

echo "Crosschain Registry code id: $CROSSCHAIN_REGISTRY_CODE_ID"

echo "Instantiating Crosschain Registry..."
osmo-exec tx wasm instantiate "$CROSSCHAIN_REGISTRY_CODE_ID" "$COMMON_INSTANTIATE_MSG" --from $OWNER --label crosschain_registry --admin $OWNER_ADDRESS $TX_FLAGS
wait_for_blocks 5

CROSSCHAIN_REGISTRY_ADDRESS=$(osmo-exec query wasm list-contract-by-code "$CROSSCHAIN_REGISTRY_CODE_ID" -o json | jq -r '.contracts | [last][0]')
echo "Crosschain Registry address: $CROSSCHAIN_REGISTRY_ADDRESS"

echo "Storing Crosschain Swaps code..."
osmo-exec tx wasm store /wasm-artifacts/crosschain_swaps.wasm --from $OWNER $TX_FLAGS
wait_for_blocks 5
CROSSCHAIN_SWAPS_CODE_ID=$(osmo-exec query wasm list-code -o json | jq -r '.code_infos[-1].code_id')

XCS_INSTANTIATE_MSG="{\"swap_contract\": \"$SWAPROUTER_ADDRESS\", \"governor\": \"$OWNER_ADDRESS\", \"registry_contract\": \"$CROSSCHAIN_REGISTRY_ADDRESS\"}"

echo "Instantiating Crosschain Swaps contract..."
osmo-exec tx wasm instantiate "$CROSSCHAIN_SWAPS_CODE_ID" "$XCS_INSTANTIATE_MSG" --from $OWNER --label crosschain_swaps --admin $OWNER_ADDRESS $TX_FLAGS
wait_for_blocks 5

CROSSCHAIN_SWAPS_ADDRESS=$(osmo-exec query wasm list-contract-by-code "$CROSSCHAIN_SWAPS_CODE_ID" -o json | jq -r '.contracts | [last][0]')
echo "Crosschain Swaps address: $CROSSCHAIN_SWAPS_ADDRESS"

echo "Persist contract information..."

osmo-cli 'cat >/contract-info.json' << EOF
{
  "swaprouter": {"codeId": "${SWAPROUTER_CODE_ID}", "address": "${SWAPROUTER_ADDRESS}"},
  "crosschain_registry": {"codeId": "${CROSSCHAIN_REGISTRY_CODE_ID}", "address": "${CROSSCHAIN_REGISTRY_ADDRESS}"},
  "crosschain_swaps": {"codeId": "${CROSSCHAIN_SWAPS_CODE_ID}", "address": "${CROSSCHAIN_SWAPS_ADDRESS}"}
}
EOF

echo "Contract Information"
osmo-cli 'cat /contract-info.json'

echo "Check instantiations..."
swaprouterContractInfo=$(osmo-exec q wasm contract-state raw $SWAPROUTER_ADDRESS $CONTRACT_INFO_HEX -o json)
check_data_not_null $swaprouterContractInfo "swaprouter not instantiated correctly"

registryContractInfo=$(osmo-exec q wasm contract-state raw $CROSSCHAIN_REGISTRY_ADDRESS $CONTRACT_INFO_HEX -o json)
check_data_not_null $registryContractInfo "crosschain_registry not instantiated correctly"

xcsContractInfo=$(osmo-exec q wasm contract-state raw $CROSSCHAIN_SWAPS_ADDRESS $CONTRACT_INFO_HEX -o json)
check_data_not_null $xcsContractInfo "crosschain_swaps not instantiated correctly"
