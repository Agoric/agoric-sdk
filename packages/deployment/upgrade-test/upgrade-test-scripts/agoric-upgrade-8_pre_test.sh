#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# ensure there's nothing in the provision pool
test_val "$(agd q bank balances agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346 -o json | jq -r '.balances | length')" "0"
