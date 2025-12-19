#!/usr/bin/env bash

# How to run manually:
# docker build --pull --rm -f "contrib/devtools/Dockerfile" -t cosmossdk-proto:latest "contrib/devtools"
# docker run --rm -v $(pwd):/workspace --workdir /workspace cosmossdk-proto sh ./scripts/protocgen.sh

set -eo pipefail
cd proto

if touch .permtest; then
  rm -f .permtest
else
  echo "ERROR: Cannot write to the current directory. Please check the permissions for this user."
  id || true
  ls -ald . || true
  exit 1
fi

echo "Generating gogo proto code"
proto_dirs=$(find . -name '*.proto' -print0 | xargs -0 -n1 dirname | sort | uniq)
for dir in $proto_dirs; do
  for file in $(find "${dir}" -maxdepth 1 -name '*.proto'); do
    echo "Generating gogo proto code for $file"
    buf generate --template buf.gen.gogo.yaml "$file"
  done
done
cd ..

# move proto files to the right places
cp -r github.com/Agoric/agoric-sdk/golang/cosmos/* ./
rm -rf github.com

go mod tidy
