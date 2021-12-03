#! /bin/bash
# npm-dist-tag.sh - add/remove/list dist-tags for NPM registry packages 
# Try: `npm-dist-tag.sh` for usage.

# Exit on any errors.
set -ueo pipefail

# Check the first argument.
OP=$1
case $OP in
lerna)
  # npm-dist-tag.sh lerna [args]...
  # Run `npm-dist-tag.sh [args]...` in every package directory.

  # Find the absolute path to this script.
  thisdir=$(cd "$(dirname -- "${BASH_SOURCE[0]}")" > /dev/null && pwd -P)
  thisprog=$(basename -- "${BASH_SOURCE[0]}")

  # Strip the first argument (`lerna`), so that `$@` gives us remaining args.
  shift
  exec npm run -- lerna exec --stream --no-bail "$thisdir/$thisprog" ${1+"$@"}
  ;;
esac

# If the package.json says it's private, we don't have a published version whose
# tags we can manipulate.
priv=$(jq -r .private package.json)
case "$priv" in
true)
  echo 1>&2 "Private package, skipping npm-dist-tag.sh"
  exit 0
  ;;
esac

# Find the package name and version from the package.json.
pkg=$(jq -r .name package.json)
version=$(jq -r .version package.json)
# echo "$OP $pkg@$version"

# Get the second argument, if any.
TAG=$2
case $OP in
add)
  # Add <tag> to the current-directory package's dist-tags.
  npm dist-tag add "$pkg@$version" "$TAG"
  ;;
remove | rm)
  # npm-dist-tag.sh remove <tag>
  # Remove <tag> from the current-directory package's dist-tags.
  npm dist-tag rm "$pkg" "$TAG"
  ;;
list | ls)
  # npm-dist-tag.sh list [<tag>]
  # List the current-directory package's dist-tags.
  # If <tag> is given, list only that tag.
  if test -n "$TAG"; then
    npm dist-tag ls "$pkg" | sed -ne "s/^$TAG: //p"
  else
    npm dist-tag ls "$pkg"
  fi
  ;;
*)
  # Usage instructions.
  echo 1>&2 "Usage: $0 [lerna] <add|remove|list> [<tag>]"
  exit 1
  ;;
esac
