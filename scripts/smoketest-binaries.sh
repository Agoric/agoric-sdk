#!/bin/bash

# For use inside of an environment (e.g. docker) to validate path of expected binaries work, and the binaries exit cleanly as well

binaries=("agd version" "agoric -V" "ag-chain-cosmos version")
for binary in "${binaries[@]}"; do
  echo "Checking $binary"
  $binary
  ec=$?
  if [[ $ec -ne 0 ]]; then
    echo "Command: $binary failed with code $ec"
    exit 1
  fi
done
