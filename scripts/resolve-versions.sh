#!/bin/bash
set -ueo pipefail

# Accepts a dependency version map on stdin and updates the current
# package.json's resolutions section to use the packages and versions from
# the map.
# This is useful for temporary bulk updates over all packages.

DIR=$(dirname -- "${BASH_SOURCE[0]}")

cd -- "${1-$DIR/..}"

override=$(jq 'to_entries | map({ key: ("**/" + .key), value: .value }) | from_entries')

PACKAGEJSONHASH=$(
  jq --arg override "$override" '. * { resolutions: ($override | fromjson) }' package.json \
    | git hash-object -w --stdin
)
git cat-file blob "$PACKAGEJSONHASH" > package.json
