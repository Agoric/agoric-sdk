#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# verify that VaultFactory works

# This is what a command looks like:
# test_val "$(agd q bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | length')" "0"

agops vaults open --wantMinted 5.00 --giveCollateral 9.0
