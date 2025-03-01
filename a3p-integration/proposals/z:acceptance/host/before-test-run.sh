#! /bin/bash

set -o xtrace

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
FOLLOWER_LOGS_FILE="/tmp/loadgen-follower-logs"
GITHUB_HOST_NAME="https://github.com"
GO_VERSION="1.22.12"
LOADGEN_REPOSITORY_NAME="testnet-load-generator"
LOGS_FILE="/tmp/before-test-run-hook-logs"
ORGANIZATION_NAME="agoric"
SDK_REPOSITORY_NAME="agoric-sdk"
TIMESTAMP="$(date '+%s')"

COMMON_PARENT="${DIRECTORY_PATH%/"$SDK_REPOSITORY_NAME"*}"
LOADGEN_REPOSITORY_LINK="$GITHUB_HOST_NAME/$ORGANIZATION_NAME/$LOADGEN_REPOSITORY_NAME.git"
NETWORK_CONFIG="/tmp/network-config-$TIMESTAMP"
OUTPUT_DIRECTORY="/tmp/loadgen-output"

get_branch_name() {
  if ! test -n "$GITHUB_HEAD_REF"; then
    if test -n "$GITHUB_REF"; then
      GITHUB_HEAD_REF="${GITHUB_REF#refs/heads/}"
    else
      GITHUB_HEAD_REF="master"
    fi
  fi

  echo "$GITHUB_HEAD_REF"
}

install_go() {
  if ! which go > /dev/null; then
    local go_tar="/tmp/go.tar.gz"

    curl --location --output "$go_tar" --silent "https://go.dev/dl/go$GO_VERSION.linux-amd64.tar.gz"
    tar --directory "$HOME" --extract --file "$go_tar" --gzip
    rm -f "$go_tar"
    export PATH="$HOME/go/bin:$PATH"
  fi
}

main() {
  install_go
  setup_sdk
  setup_loadgen_runner
  mkdir -p "$NETWORK_CONFIG" "$OUTPUT_DIRECTORY"
  wait_for_network_config
  start_follower > "$FOLLOWER_LOGS_FILE" 2>&1
}

setup_loadgen_runner() {
  cd "$COMMON_PARENT" || exit
  git clone "$LOADGEN_REPOSITORY_LINK"
  cd "$LOADGEN_REPOSITORY_NAME/runner" || exit
  yarn install
}

setup_sdk() {
  cd "$COMMON_PARENT/$SDK_REPOSITORY_NAME" || exit
  yarn install
  make --directory "packages/cosmic-swingset" all
}

start_follower() {
  AG_CHAIN_COSMOS_HOME="$HOME/.agoric" \
    SDK_SRC="$HOME/$SDK_REPOSITORY_NAME" \
    "$HOME/$LOADGEN_REPOSITORY_NAME/runner/bin/loadgen-runner" \
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
