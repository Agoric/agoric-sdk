#! /bin/bash
# Usage: get-packed-versions.sh <WORKDIR>
#
# This script creates package tarballs in the specified workspace directory and
# writes out information for resolve-versions.sh to update a destination
# workspace to use them.  This is useful for testing changes to dependencies of
# the destination repository.
set -xueo pipefail

WORKDIR=${1:-.}
cd -- "$WORKDIR" 1>&2

# Install and build the source directory.
yarn install 1>&2
yarn build 1>&2
yarn --silent workspaces info | jq -r '.[].location' | while read -r dir; do
  # Skip private packages.
  echo "dir=$dir" 1>&2
  test "$(jq .private < "$dir/package.json")" != true || continue

  ##################
  pushd "$dir" 1>&2

  # Gather the metadata.
  name=$(jq -r .name < package.json)
  version=$(jq -r .version < package.json)
  stem=$(echo "$name" | sed -e 's!^@!!; s!/!-!g;')
  file="$(pwd)/${stem}-v${version}.tgz"

  # Create the tarball.
  yarn pack 1>&2

  # Write out the version entry.
  jq -s --arg name "$name" --arg file "$file" \
      '{ key: $name, value: ("file:" + $file) }' < /dev/null

  popd 1>&2
  ##################
done | jq -s from_entries
