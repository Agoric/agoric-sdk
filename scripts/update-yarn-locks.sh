#! /bin/bash
set -ueo pipefail

# This script updates all yarn.lock files in the repository, except for the one
# in the root directory.
find . -name node_modules -prune -o -name yarn.lock -print0 \
  | while IFS= read -r -d $'\0' lockfile; do
    dir="$(dirname "$lockfile")"
    test "$dir" != . || continue
    echo "Updating $lockfile"
    (
      cd "$dir"
      if test "${COREPACK_ROOT+set}" = set; then
        "$COREPACK_ROOT/shims/yarn" install
      else
        yarn install
      fi
    )
  done
echo "All yarn.lock files updated."
