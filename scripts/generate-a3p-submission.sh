#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd $sdkroot
yarn agoric run packages/builders/scripts/vats/restart-vats.js

mkdir -p $sdkroot/a3p-integration/proposals/b:restart-vats/submission
cp $(grep -oh '/.*b1-.*.json' $sdkroot/restart-vats*) a3p-integration/proposals/b:restart-vats/submission
mv $sdkroot/restart-vats* a3p-integration/proposals/b:restart-vats/submission

