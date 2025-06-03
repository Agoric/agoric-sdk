#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

# Expect params to match values from drop-ist.json.
params="$(agd query swingset params -o json)"
test_val \
  "$(echo "$params" | jq -r '.fee_unit_price | map(.amount + .denom) | .[]')" \
  1000000ubld \
  'fee_unit_price'
test_val \
  "$(echo "$params" | jq -r '.beans_per_unit[] | select(.key == "feeUnit") | .beans')" \
  20000000000 \
  'beans_per_unit "feeUnit"'
test_val \
  "$(echo "$params" | jq -r '.beans_per_unit[] | select(.key == "smartWalletProvision") | .beans')" \
  200000000000 \
  'beans_per_unit "smartWalletProvision"'
