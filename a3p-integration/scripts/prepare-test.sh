#!/bin/bash
set -ueo pipefail

# Vendor local packages for all proposals before Docker build
for proposalDir in ./proposals/?:*; do
  if [ -f "$proposalDir/package.json" ]; then
    ./scripts/copy-local-packages.sh "$proposalDir" || true
  fi
done
