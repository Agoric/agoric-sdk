#!/bin/bash

source /usr/src/upgrade-test-scripts/env_setup.sh

export_genesis() {
  GENESIS_EXPORT_DIR="$1"
  shift
  GENESIS_HEIGHT_ARG=

  if [ -n "$1" ]; then
    GENESIS_HEIGHT_ARG="--height $1"
    shift
  fi

  agd export --export-dir "$GENESIS_EXPORT_DIR" $GENESIS_HEIGHT_ARG "$@"
}

killAgd
FORK_TEST_DIR="$(mktemp -t -d fork-test-XXX)"
mkdir -p "$FORK_TEST_DIR/config"
cp /root/.agoric/config/priv_validator_key.json "$FORK_TEST_DIR/config"
agd --home "$FORK_TEST_DIR" tendermint unsafe-reset-all

export_genesis "$FORK_TEST_DIR/config"
startAgd --home "$FORK_TEST_DIR"
