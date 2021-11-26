#! /bin/bash
# dist-tag.sh - manage dist-tags for NPM registry packages 
set -e
OP=$1
TAG=$2

case $OP in
lerna)
  # Run for all the packages under lerna management.
  thisdir=$(cd "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
  thisprog=$(basename -- "${BASH_SOURCE[0]}")
  shift
  exec npm run -- lerna exec --stream --no-bail "$thisdir/$thisprog" ${1+"$@"}
  ;;
esac

priv=$(jq -r .private package.json)
case "$priv" in
true)
  echo 1>&2 "Private package, skipping dist-tag.sh"
  exit 0
  ;;
esac

pkg=$(jq -r .name package.json)
version=$(jq -r .version package.json)
# echo "$OP $pkg@$version"

case $OP in
add)
  npm dist-tag add "$pkg@$version" "$TAG"
  ;;
remove | rm)
  npm dist-tag rm "$pkg" "$TAG"
  ;;
list | ls)
  if test -n "$TAG"; then
    npm dist-tag ls "$pkg" | sed -ne "s/^$TAG: //p"
  else
    npm dist-tag ls "$pkg"
  fi
  ;;
*)
  echo 1>&2 "Usage: $0 [lerna] <add|remove|list> [<tag>]"
  exit 1
  ;;
esac
