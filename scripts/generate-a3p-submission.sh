#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd "$sdkroot"

proposalDir=$1
proposalName=$2
outfileBase=${3:-$proposalName}
submissionDirName=${4:-submission}

yarn agoric run "packages/builders/scripts/vats/$proposalName.js"

submissionDir="./a3p-integration/$proposalDir/$submissionDirName"

mkdir -p "$submissionDir"
cp $(grep -oh '/.*b1-.*.json' "$outfileBase"*) "$submissionDir"

mv "$outfileBase"* "$submissionDir"
