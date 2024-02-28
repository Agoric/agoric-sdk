#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd "$sdkroot"

buildSubmission() {
  proposalName=$1
  a3pProposal=$2
  output=${3:-$proposalName}
  submissionName=${4:-submission}

  yarn agoric run "packages/builders/scripts/vats/$proposalName.js"


  submissionDir="a3p-integration/proposals/$a3pProposal/$submissionName"
  mkdir -p "$submissionDir"
  cp $(grep -oh '/.*b1-.*.json' "$output"*) "$submissionDir"
  mv "$output"* "$submissionDir"
}

buildSubmission probe-zcf-bundle "a:upgrade-next" probeZcfBundle probe-submission
buildSubmission test-localchain "b:localchain"
