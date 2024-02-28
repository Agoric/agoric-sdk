#!/bin/bash
set -ueo pipefail

SCRIPT_DIR=$( cd ${0%/*} && pwd -P )

for proposal in ./proposals/?:*
do
  cd $proposal
  submission=`jq -r < package.json '.agoricProposal.submission'`
  args=`jq -r < package.json .agoricProposal[\"$submission\"]`
  $SCRIPT_DIR/generate-a3p-submission.sh $submission $args
  cd -
done
