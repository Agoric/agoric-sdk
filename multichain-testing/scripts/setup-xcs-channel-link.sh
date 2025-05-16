#!/bin/bash

set -euo pipefail
shopt -s expand_aliases

alias osmosis-exec="kubectl exec -i osmosislocal-genesis-0 -c validator -- osmosisd"
alias osmosis-cli="kubectl exec -i osmosislocal-genesis-0 -c validator -- /bin/bash -c"
alias hermes-exec="kubectl exec -i hermes-agoric-osmosis-0 -c relayer -- hermes"

REGISTRY_ADDRESS=$(osmosis-cli "jq -r '.crosschain_registry.address' /contract-info.json")

CHAIN_A="$1"
CHAIN_B="$2"

CHANNEL_INFO=$(hermes-exec --json query channels --show-counterparty --chain "${CHAIN_A}local" \
  | jq --arg CHAIN_B_LOCAL "${CHAIN_B}local" '.result[] | select(.chain_id_b == $CHAIN_B_LOCAL)')

CHAIN_A_CHAIN_B_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_a')
CHAIN_B_CHAIN_A_CHANNEL=$(echo "$CHANNEL_INFO" | jq -r '.channel_b')

OSMOSIS_GENESIS_WALLET="genesis"
OSMOSIS_GENESIS_ADDRESS=$(osmosis-exec keys show ${OSMOSIS_GENESIS_WALLET} -a)

MAX_RETRIES="5"
DELAY="5"

MODIFY_CHAIN_CHANNEL_LINKS=$(jq -n \
  --arg chainA "$CHAIN_A" \
  --arg chainB "$CHAIN_B" \
  --arg channelA "$CHAIN_A_CHAIN_B_CHANNEL" \
  --arg channelB "$CHAIN_B_CHAIN_A_CHANNEL" \
  '{
    modify_chain_channel_links: {
        operations: [
            {
                operation: "set",
                source_chain: $chainA,
                destination_chain: $chainB,
                channel_id: $channelA
            },
            {
                operation: "set",
                source_chain: $chainB,
                destination_chain: $chainA,
                channel_id: $channelB
            }
        ]}
}')

GET_CHAIN_CHANNEL_LINKS=$(jq -n \
  --arg chainA "$CHAIN_A" \
  --arg chainB "$CHAIN_B" \
  '{
    get_channel_from_chain_pair: {
        source_chain: $chainA,
        destination_chain: $chainB,
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

    if [[ $? -eq 0 && $chain_channel_link = "{\"data\":\"$CHAIN_A_CHAIN_B_CHANNEL\"}" ]]; then
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
