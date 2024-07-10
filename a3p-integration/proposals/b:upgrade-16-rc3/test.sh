#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

GLOBIGNORE=initial.test.js

# test the state right after upgrade
yarn ava initial.test.js

# test more, in ways that changes system state
yarn ava ./*.test.js
