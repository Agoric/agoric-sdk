#!/bin/bash
set -ueo pipefail

# Usage: $0 <builder script> [submission directory name] [builder script arg]...
# Run the specified builder script from packages/builders/scripts and move the
# output into the specified submission directory (defaulting to "submission")
# relative to the working directory.
# Must be run from inside agoric-sdk.

builderScript=$1
shift
submissionDir=${1:-submission}
shift || true

# Run the builder script in a subshell at agoric-sdk.
sdkroot=$(git rev-parse --show-toplevel)
(
  cd "$sdkroot"
  npm exec agoric run -- --verbose "packages/builders/scripts/$builderScript" "$@"
)

# Create and populate the submission directory.
mkdir -p "$submissionDir"
echo >&2 "Populating $(basename -- "$(pwd -P)")/$submissionDir ..."
ls "$sdkroot"/*-plan.json | while read plan; do
  # Copy from the bundle cache.
  cp $(grep -oh '/.*b1-.*.json' "$plan") "$submissionDir"

  # Move from the root directory.
  prefix=${plan%-plan.json}
  mv "$prefix"* "$submissionDir"

  ls -oS "$submissionDir"
done
