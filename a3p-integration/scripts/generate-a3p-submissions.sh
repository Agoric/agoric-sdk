#!/bin/bash
set -ueo pipefail

SCRIPT_DIR=$( cd ${0%/*} && pwd -P )

IFS=$'\n'

for proposal in ./proposals/?:*; do
  cd $proposal
  while read -r line; do
    IFS=' ' parts=( $line )
    $SCRIPT_DIR/generate-a3p-submission.sh $proposal ${parts[@]}
  done < <(jq -r < package.json '.agoricProposal["sdk-generate"][]')
  cd -
done
