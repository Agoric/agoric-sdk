#! /bin/bash

set -o nounset -o xtrace

AG_CHAIN_COSMOS_HOME="$HOME/.agoric"
DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
FOLLOWER_LOGS_FILE="/tmp/loadgen-follower-logs"
LOGS_FILE="/tmp/before-test-run-hook-logs"
SDK_REPOSITORY_NAME="agoric-sdk"
TIMESTAMP="$(date '+%s')"

COMMON_PARENT="${DIRECTORY_PATH%/"$SDK_REPOSITORY_NAME"*}"
NETWORK_CONFIG="/tmp/network-config-$TIMESTAMP"
OUTPUT_DIRECTORY="/tmp/loadgen-output"

main() {
  mkdir -p "$AG_CHAIN_COSMOS_HOME" "$NETWORK_CONFIG" "$OUTPUT_DIRECTORY"
  wait_for_network_config
  start_follower > "$FOLLOWER_LOGS_FILE" 2>&1
}

start_follower() {
  AG_CHAIN_COSMOS_HOME="$AG_CHAIN_COSMOS_HOME" \
    SDK_SRC="$COMMON_PARENT/$SDK_REPOSITORY_NAME" \
    "$LOADGEN_PATH/runner/bin/loadgen-runner" \
    --acceptance-integration-message-file "$MESSAGE_FILE_PATH" \
    --chain-only \
    --custom-bootstrap \
    --no-stage.save-storage \
    --output-dir "$OUTPUT_DIRECTORY" \
    --profile "testnet" \
    --stages "3" \
    --testnet-origin "file://$NETWORK_CONFIG" \
    --use-state-sync

  echo -n "exit code $?" > "$MESSAGE_FILE_PATH"
}

wait_for_network_config() {
  local network_config

  network_config=$(node "$DIRECTORY_PATH/../wait-for-follower.mjs" "^{.*")
  echo "Got network config: $network_config"
  echo "$network_config" > "$NETWORK_CONFIG/network-config"
}

main > "$LOGS_FILE" 2>&1 &
