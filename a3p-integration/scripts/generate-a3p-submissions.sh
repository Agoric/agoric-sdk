#!/bin/bash
set -ueo pipefail

# cd prints its target, so without the redirect, we get two copies
SCRIPT_DIR=$(cd ${0%/*} > /dev/null && pwd -P)

IFS=$'\n'

for proposal in ./proposals/?:*; do
  cd $proposal
  while read -r line; do
    IFS=' ' parts=($line)
    $SCRIPT_DIR/generate-a3p-submission.sh $proposal ${parts[@]}
  done < <(jq -r '.agoricProposal["sdk-generate"][]' < package.json)
  cd -
done
