#!/bin/bash
# Verifies that files in package.json covers everything xsnap needs to compile
# from sources out of an npm package.
set -xueo pipefail

TEMP=$(mktemp -d)
# function cleanup() {
#   rm -rf "$TEMP"
# }
# trap cleanup EXIT

yarn pack -f "$TEMP/package.tar"
(
  cd "$TEMP"
  tar xvf package.tar
  cd package
  time yarn
  time yarn
  time yarn
  time yarn
)
