#! /usr/bin/env bash
set -ueo pipefail

# Usage: export-a3p.sh <a3p_dir> <dest_dir>
# Copy an agoric-3-proposals directory, omitting `agoric-sdk`, `node_modules`,
# and `.yarn`, and replacing colons in proposal directory names (children of
# $a3p_dir/proposals) with dashes.
# https://github.com/Agoric/agoric-3-proposals
#
# The result is ready to be uploaded as an artifact from GitHub Actions.
# https://github.com/actions/upload-artifact

a3p_dir="${1-}"
dest_dir="${2-}"
if ! [ "$#" -eq 2 -a -n "$a3p_dir" -a -n "$dest_dir" ]; then
  echo "Usage: $0 <a3p_dir> <dest_dir>" >&2
  exit 64
fi
if [ -e "$dest_dir" ]; then
  echo "Destination already exists: $dest_dir"
  exit 1
fi

# Because of the exclusions, copying applies to disjoint subtrees of $a3p_dir:
# * children except `agoric-sdk` and `proposals`
# * file children of `proposals`, i.e. `proposals/*`
# * grandchildren of `proposals`, i.e. `proposals/*/*`
#
# We accomplish this by consuming (subdir?, depth, `find` filter?) tuples.
SUBSEP="$(printf '\x1C')"
printf "    $SUBSEP 1 $SUBSEP -not -name agoric-sdk -not -name proposals
  proposals $SUBSEP 1 $SUBSEP -type f
  proposals $SUBSEP 2
" \
  | sed -E 's/^ *|#.*//g; /^[[:space:]]*$/d;' \
  | while IFS="$SUBSEP" read subdir depth filter; do
    find "$a3p_dir/"$subdir -mindepth ${depth:-1} -maxdepth ${depth:-1} \
      -name node_modules -prune -o -name .yarn -prune -o $filter -print \
      | while read -r path; do
        relpath="${path#"$a3p_dir/"}"
        reldir="$(dirname -- "$relpath")"
        dest_subdir="$dest_dir/$reldir"
        [ "$reldir" = . ] && dest_subdir="$dest_dir" # remove trailing `/.`
        sanitized="${dest_subdir//:/-}"              # replace each `:` with `-`
        mkdir -p "$sanitized"
        cp -r -- "$path" "$sanitized/"
        echo "Copied $(dirname -- "$path") to $sanitized"
      done \
      | uniq
  done
