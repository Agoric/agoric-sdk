#! /bin/bash

set -euo pipefail

DIVERGENT=${1-divergent.md}
test -f refork-config.sh || {
  echo "This script must be run from a directory containing refork-config.sh" 1>&2
  echo "Usage: $0 [divergent.md]" 1>&2
  exit 1 
}

# shellcheck disable=SC1091
source refork-config.sh

delete () {
  f="$1"
  echo "File $f is marked for deletion." 1>&2
  read -r -n1 -p 'Delete file (y/N)? ' ans
  echo
  case $ans in
  [yY]*) git rm -f "$f" ;;
  *) echo "Not deleting file $f" ;;
  esac
}

diffco () {
  git diff --exit-code "$@" >/dev/null && return $?
  git diff "$@"
  read -r -n1 -p 'Undo changes (y/N)? ' answer
  echo
  case $answer in
  y* | Y*) ;;
  *) echo "Not undoing changes for $*"; return 1 ;;
  esac
  echo
  git checkout "$@"
}

# Allow DIVERGENT lines to have optional leading > or * (e.g. from a markdown list), and extract the filename.
sed -e 's/^ *\([>*] *\)*//g' "$DIVERGENT" | while read -r d; do
  # shellcheck disable=SC2001
  f=$(echo "$d" | sed -e 's/^ *\([^ ][^ ]*\).*/\1/')
  test -n "$f" || continue

  case $d in
  *[Dd]'elete'*)
    echo "delete $f"
    ;;
  *)
    echo "diffco $TARGET_REF -- $f"
    ;;
  esac
done > refork-workspace/undiverge.sh
# shellcheck disable=SC1091
. refork-workspace/undiverge.sh
