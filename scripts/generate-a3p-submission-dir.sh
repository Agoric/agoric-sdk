#!/bin/bash
set -ueo pipefail

SCRIPT_DIR=$( cd "${0%/*}" && pwd -P )

for proposal in ./proposals/?:*
do
  cd "$proposal"
  args=$(jq -r < package.json '.agoricProposal["sdk-generate"][0]')
  "$SCRIPT_DIR/generate-a3p-submission.sh" "$proposal" $args
  cd -
done
