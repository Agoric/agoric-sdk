#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd "$sdkroot"

buildSubmission() {
  proposalName=$1
  a3pProposal=$2

  yarn agoric run "packages/builders/scripts/vats/$proposalName.js"

  submissionDir="a3p-integration/proposals/$a3pProposal/submission"
  mkdir -p "$submissionDir"
  cp $(grep -oh '/.*b1-.*.json' "$proposalName"*) "$submissionDir"
  mv "$proposalName"* "$submissionDir"
}

buildSubmission test-localchain "b:localchain"
