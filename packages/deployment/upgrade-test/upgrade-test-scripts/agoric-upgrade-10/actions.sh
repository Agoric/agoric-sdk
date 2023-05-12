#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# For development:
# TARGET=agoric-upgrade-10 make local_sdk build run

# smart wallets and GOV 1,2,3 should already be there

# Accept EC invites

# vote in a usable MintLimit

# oracles
#  agops oracle accept --offerId $(newOfferId)
# open a vault

# bids
# agops inter bid by-price --price 1 --give 1.0IST  --from $GOV1ADDR --keyring-backend test
