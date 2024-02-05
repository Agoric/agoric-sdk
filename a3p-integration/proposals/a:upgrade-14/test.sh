#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

yarn ava

./create-kread-item-test.sh
