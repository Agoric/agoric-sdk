#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

echo  VAULTS-AUCTIONS test starting

# test more, in ways that change system state
yarn ava ./*.test.js
