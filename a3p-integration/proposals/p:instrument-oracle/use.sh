#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

for key_name in instrumentOracle presleyAgent evmHandler; do
  if ! agd keys show "$key_name" --keyring-backend=test >/dev/null 2>&1; then
    agd keys add "$key_name" --keyring-backend=test >/dev/null 2>&1
  fi
  key_addr="$(agd keys show -a "$key_name" --keyring-backend=test)"
  provisionSmartWallet "$key_addr" "200000000ubld"
done
