#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

# test the state right after the previous proposals
yarn ava initial.test.js

# test more, in ways that change system state
GLOBIGNORE=initial.test.js
yarn ava ./*.test.js

./create-kread-item-test.sh

./state-sync-snapshots-test.sh
./genesis-test.sh
