#!/bin/bash
# Verifies that files in package.json covers everything xsnap needs to compile
# from sources out of an npm package.
set -xueo pipefail

TEMP=$(mktemp -d)
# function cleanup() {
#   rm -rf "$TEMP"
# }
# trap cleanup EXIT

PKG=$(cd -- "$(dirname "$0")/.." && pwd)
ROOT=$(git -C "$PKG" rev-parse --show-toplevel)

# Pack via ts-node-pack — the same path xsnap is published through — so that
# `workspace:` deps are resolved. Raw `npm pack` would leave `workspace:*` in
# the manifest, which the `yarn`/`npm install` below can't consume. ts-node-pack
# still runs `npm pack` internally, so this exercises the same files-list
# resolution the test exists to cover. It writes <name>-<version>.tgz into its
# CWD; $TEMP is freshly created, so it holds exactly one tarball.
(cd "$TEMP" && "$ROOT/node_modules/.bin/ts-node-pack" "$PKG")
(
  cd "$TEMP"
  tar xvf ./*.tgz
  cd package
  time yarn
  time yarn
  time yarn
  time yarn
)
