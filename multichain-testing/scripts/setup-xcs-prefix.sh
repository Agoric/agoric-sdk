#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias osmosis-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"
alias osmosis-cli="kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c"
alias hermes-exec="kubectl exec -i hermes-agoric-osmosis-0 -c relayer -- hermes"

REGISTRY_ADDRESS=$(osmosis-cli "jq -r '.crosschain_registry.address' /contract-info.json")

OSMOSIS_GENESIS_WALLET="genesis"
OSMOSIS_GENESIS_ADDRESS=$(osmosis-exec keys show ${OSMOSIS_GENESIS_WALLET} -a)

MAX_RETRIES="5"
DELAY="5"

MODIFY_BECH32_PREFIXES=$(jq -n \
  '{
    modify_bech32_prefixes: {
      operations: [
        {
          operation: "set",
          chain_name: "osmosis",
          prefix: "osmo"
        },
        {
          operation: "set",
          chain_name: "agoric",
          prefix: "agoric"
        },
        {
          operation: "set",
          chain_name: "cosmoshub",
          prefix: "cosmos"
        }
      ]
    }
}')

GET_BECH32_PREFIXES=$(jq -n \
  '{
    get_bech32_prefix_from_chain_name: {
        chain_name: "osmosis",
    }
}')

echo "Modifying prefixes ..."
osmosis-exec tx wasm execute "$REGISTRY_ADDRESS" "$MODIFY_BECH32_PREFIXES" --from "$OSMOSIS_GENESIS_ADDRESS" --keyring-backend=test --gas=auto --gas-prices 0.1uosmo --gas-adjustment 1.3 --yes --chain-id osmosislocal

echo "Querying prefixes ..."
(
  set +e

  for ((i = 1; i <= MAX_RETRIES; i++)); do
    echo "Attempt $i of $MAX_RETRIES..."
    chain_channel_link=$(osmosis-exec query wasm contract-state smart "$REGISTRY_ADDRESS" "$GET_BECH32_PREFIXES" 2> /dev/null)

    if [[ $? -eq 0 && $chain_channel_link = '{"data":"osmo"}' ]]; then
      echo "Prefixes found:"
      echo "$chain_channel_link"
      break
    fi

    if [[ $i -eq MAX_RETRIES ]]; then
      echo "Prefixes not registered after $MAX_RETRIES attempts."
      exit 1
    fi

    echo "Query failed. Waiting $DELAY seconds before retrying..."
    sleep "$DELAY"
  done
)
