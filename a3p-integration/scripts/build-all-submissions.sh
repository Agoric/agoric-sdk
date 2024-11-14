#!/bin/bash
set -ueo pipefail

# Look in the "proposals" subdirectory of the working directory for
# "$char:$name" subdirectories (cf. ../README.md#package-layering), and for each
# one, extract from its package.json "agoricProposal" section a list of
# "sdk-generate" entries corresponding to core-eval submission content that must
# be generated (cf ../README.md#generating-core-eval-submissions) and then use
# ./build-submission.sh to do so.

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)

IFS=$'\n'

for proposal in ./proposals/?:*; do
  echo >&2 "Building $proposal ..."
  cd $proposal
  while read -r line; do
    IFS=' ' parts=($line)
    "$SCRIPT_DIR"/build-submission.sh ${parts[@]}
  done < <(jq -r '.agoricProposal["sdk-generate"][]?' < package.json)
  cd -
  echo >&2 "Built $proposal"
done
