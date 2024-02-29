#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd "$sdkroot"

proposalName=$1
outfileBase=${2:-$proposalName}
submissionDirName=${3:-submission}

yarn agoric run "packages/builders/scripts/vats/$proposalName.js"

submissionDir="./$submissionDirName"
mkdir -p "$submissionDir"
cp $(grep -oh '/.*b1-.*.json' "$outfileBase"*) "$submissionDir"

mv "$outfileBase"* "$submissionDir"
