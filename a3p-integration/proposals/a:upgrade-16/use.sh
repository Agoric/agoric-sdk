#!/bin/bash

# Place here any actions that should happen after the upgrade has executed. The
# actions are executed in the upgraded chain software and the effects are
# persisted in the generated image for the upgrade, so they can be used in
# later steps, such as the "test" step, or further proposal layers.

source /usr/src/upgrade-test-scripts/env_setup.sh
AGVM=/usr/src/agoric-sdk/packages/cosmic-swingset/bin/ag-chain-cosmos

waitForBlock 2
killAgd
startAgd --split-vm="$AGVM"
