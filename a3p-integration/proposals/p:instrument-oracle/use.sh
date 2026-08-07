#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

if ! agd keys show instrumentOracle --keyring-backend=test >/dev/null 2>&1; then
  agd keys add instrumentOracle --keyring-backend=test >/dev/null 2>&1
fi
oracle_addr="$(agd keys show -a instrumentOracle --keyring-backend=test)"
provisionSmartWallet "$oracle_addr" "200000000ubld"
