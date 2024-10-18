#!/bin/bash
set -ueo pipefail

sdkroot=$(git rev-parse --show-toplevel)

cd "$sdkroot"

a3pProposalDir=$1
builderScript=$2
submissionDirName=${3:-submission}
submissionDir="./a3p-integration/$a3pProposalDir/$submissionDirName"
extraParams=${4:-}

yarn agoric run "packages/builders/scripts/$builderScript" $extraParams
mkdir -p "$submissionDir"

plans=*-plan.json
for plan in $plans; do
  base=${plan%-plan.json}
  cp $(grep -oh '/.*b1-.*.json' "$base"-plan.json) "$submissionDir"
  mv "$base"* "$submissionDir"
  ls -oS "$submissionDir"
done
