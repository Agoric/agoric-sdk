#!/bin/bash

NODE_MEMORY_SIZE="${NODE_MEMORY_SIZE:-"2048"}"

# CI artifact export expects the files to be under `coverage` (same for /html below)
export NODE_V8_COVERAGE="$PWD/coverage/tmp"

# clear out old coverage. c8 usually does this but we have to clean=false below so it accumulates across packages
rm -rf "$NODE_V8_COVERAGE"
mkdir -p "$NODE_V8_COVERAGE"

# the package test:c8 commands will include this
export C8_OPTIONS="--clean=false"
export NODE_OPTIONS="--max-old-space-size=$NODE_MEMORY_SIZE"

# XXX uses lerna when `yarn workspaces run` should work, but in v1 it always bails on missing script
yarn lerna run test:c8 --no-bail

# report over all src and tools files, not just the ones that were loaded during tests
yarn c8 report --all --include 'packages/*/{src,tools}' --reporter=html-spa --reports-dir=coverage/html
