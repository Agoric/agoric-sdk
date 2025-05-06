#!/bin/bash
set -euo pipefail

# segregate so changing these does not invalidate the proposal image
# à la https://github.com/Agoric/agoric-3-proposals/pull/213
cd test

echo AVAILABLE WALLETs
agd query vstorage children published.wallet

yarn ava

./test-cli.sh
