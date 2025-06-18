#! /bin/bash
# Usage: replace-packages.sh <SRCDIR> [<DSTDIR>]
#
# This script replaces the packages in the $DSTDIR directory (default
# ./node_modules) with the packed-then-unpacked NPM packages from the $SRCDIR
# Yarn workspace. This is useful for testing changes to dependencies of the
# current repository.
set -xueo pipefail

SRCDIR=$1
DSTDIR=${2-$PWD/node_modules}

# Install and build the source directory.
pushd "$SRCDIR"
yarn install
yarn postinstall
npm run build

npm query .workspace | jq -r '.[].location' | while read -r dir; do
  # Skip private packages.
  test "$(jq .private < "$dir/package.json")" != true || continue

  # Create the tarball.
  pushd "$dir"
  name=$(jq -r .name < package.json)
  stem=$(echo "$name" | sed -e 's!^@!!; s!/!-!g;')
  tarball="${stem}-replace.tgz"
  rm -f "$tarball"
  yarn pack --out "$tarball"
  tar -xvf "$tarball"

  # Replace the destination package.
  rm -rf "${DSTDIR:?}/$name"
  mkdir -p "$(dirname "${DSTDIR:?}/$name")"
  mv package "${DSTDIR:?}/$name"
  popd
done
popd
