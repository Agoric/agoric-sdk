#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(cd -- "$SCRIPT_DIR/.." && pwd)

cd "$ROOT_DIR"

./scripts/ensure-corepack-yarn.sh

echo "==> golang/cosmos: make proto-gen"
yarn workspace @agoric/cosmos exec make proto-gen

echo "==> packages/cosmic-proto: yarn workspace @agoric/cosmic-proto codegen"
yarn workspace @agoric/cosmic-proto codegen

echo "==> packages/client-utils: yarn workspace @agoric/client-utils codegen"
yarn workspace @agoric/client-utils codegen

echo "==> packages/orchestration: yarn workspace @agoric/orchestration codegen"
yarn workspace @agoric/orchestration codegen
