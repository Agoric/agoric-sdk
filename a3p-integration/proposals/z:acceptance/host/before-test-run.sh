#! /bin/bash
# We cannot fail the script on error (using set -e or set -o errexit)
# as the exit code has to be written to the message file and the tests
# will get stuck if the exit code (wether failure or success) is never
# written to the message file
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
  wait_for_rpc
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

wait_for_rpc() {
  local rpc_address
  local status_code

  rpc_address="$(jq --raw-output '.rpcAddrs[0]' < "$NETWORK_CONFIG/network-config")"

  echo "Waiting for rpc '$rpc_address' to respond"

  while true; do
    curl "$rpc_address" --max-time "5" --silent > /dev/null 2>&1
    status_code="$?"

    echo "rpc '$rpc_address' responded with '$status_code'"

    if ! test "$status_code" -eq "0"; then
      sleep 5
    else
      break
    fi
  done

  echo "rpc '$rpc_address' is up"
}

main > "$LOGS_FILE" 2>&1 &
