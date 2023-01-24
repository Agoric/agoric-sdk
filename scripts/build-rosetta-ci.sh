#!/bin/bash

# Exit on any errors.
set -ueo pipefail

SDK_REAL_DIR="$(cd "$(dirname "$(readlink -f -- "$0")")/.." > /dev/null && pwd -P)"

# Build a container the rosetta-ci container for packages/rosetta
docker build -t rosetta-ci:latest -f "$SDK_REAL_DIR/packages/rosetta/rosetta-ci/Dockerfile" .

