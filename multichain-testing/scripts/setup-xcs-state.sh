#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias osmosis-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"
alias osmosis-cli="kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c"
alias hermes-exec="kubectl exec -i hermes-agoric-osmosis-0 -c relayer -- hermes"

REGISTRY_ADDRESS=$(osmosis-cli "jq -r '.crosschain_registry.address' /contract-info.json")

CHANNEL_INFO=$(hermes-exec --json query channels --show-counterparty --chain agoriclocal \
  | jq '[.][] | select(.result) | .result[] | select(.chain_id_b == "osmosislocal")')
AGORIC_OSMOSIS_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_a')
OSMOSIS_AGORIC_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_b')

OSMOSIS_GENESIS_WALLET="genesis"
OSMOSIS_GENESIS_ADDRESS=$(osmosis-exec keys show ${OSMOSIS_GENESIS_WALLET} -a)

MAX_RETRIES="5"
DELAY="5"

MODIFY_CHAIN_CHANNEL_LINKS=$(jq -n \
  --arg chanA "$AGORIC_OSMOSIS_CHANNEL" \
  --arg chanB "$OSMOSIS_AGORIC_CHANNEL" \
  '{
    modify_chain_channel_links: {
        operations: [
            {
                operation: "set",
                source_chain: "agoric",
                destination_chain: "osmosis",
                channel_id: $chanA
            },
            {
                operation: "set",
                source_chain: "osmosis",
                destination_chain: "agoric",
                channel_id: $chanB
            }
        ]}
}')

GET_CHAIN_CHANNEL_LINKS=$(jq -n \
  '{
    get_channel_from_chain_pair: {
        source_chain: "osmosis",
        destination_chain: "agoric",
    }
}')

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

echo "Modifying chain channel links ..."
osmosis-exec tx wasm execute "$REGISTRY_ADDRESS" "$MODIFY_CHAIN_CHANNEL_LINKS" --from "$OSMOSIS_GENESIS_ADDRESS" --keyring-backend=test --gas=auto --gas-prices 0.1uosmo --gas-adjustment 1.3 --yes --chain-id osmosislocal

echo "Querying chain channel links ..."
(
  set +e

  for ((i = 1; i <= MAX_RETRIES; i++)); do
    echo "Attempt $i of $MAX_RETRIES..."
    chain_channel_link=$(osmosis-exec query wasm contract-state smart "$REGISTRY_ADDRESS" "$GET_CHAIN_CHANNEL_LINKS" 2> /dev/null)

    if [[ $? -eq 0 && $chain_channel_link = "{\"data\":\"$OSMOSIS_AGORIC_CHANNEL\"}" ]]; then
      echo "Chain channel link found:"
      echo "$chain_channel_link"
      break
    fi

    if [[ $i -eq MAX_RETRIES ]]; then
      echo "Chain channel link not registered after $MAX_RETRIES attempts."
      exit 1
    fi

    echo "Query failed. Waiting $DELAY seconds before retrying..."
    sleep "$DELAY"
  done
)

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
