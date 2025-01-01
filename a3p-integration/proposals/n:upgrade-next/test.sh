#!/bin/bash
set -ueo pipefail
source /usr/src/upgrade-test-scripts/env_setup.sh

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

test_val \
  "$(agd q swingset params -o json | jq -Sc .vat_cleanup_budget)" \
  '[{"key":"default","value":"5"},{"key":"kv","value":"50"}]' \
  'vat cleanup budget'

# suppress file names from glob that run earlier
GLOBIGNORE=initial.test.js

# test the state right after upgrade
yarn ava initial.test.js

# test more, in ways that change system state
yarn ava ./*.test.js
