#!/bin/bash
set -euo pipefail

echo AVAILABLE WALLETs
agd query vstorage children published.wallet

yarn ava

./test-cli.sh
