#!/bin/bash
set -ueo pipefail

sdkroot=$(cd -- "$(dirname "$0")/.." >/dev/null && pwd)

cd $sdkroot

buildSubmission() {
  proposalName=$1
  a3pProposal=$2

  yarn agoric run packages/builders/scripts/vats/$1.js

  mkdir -p $sdkroot/a3p-integration/proposals/$2/submission
  cp $(grep -oh '/.*b1-.*.json' $sdkroot/$1*) a3p-integration/proposals/$2/submission
  mv $sdkroot/$1* a3p-integration/proposals/$2/submission
}

buildSubmission restart-vats "b:restart-vats"
