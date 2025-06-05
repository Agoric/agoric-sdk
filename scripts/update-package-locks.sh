#! /bin/bash
set -ueo pipefail

# cd to the script's directory
cd "$(dirname -- "$(readlink -f -- "$0")")/.."

# Check if COREPACK_ROOT is set, which means we need to explicitly
# use the corepack shims from it (otherwise recursive calls to
# just "yarn" will fail).
if test "${COREPACK_ROOT+set}" = set; then
  COREPACK_SHIMS="$COREPACK_ROOT/shims/"
else
  COREPACK_SHIMS=
fi

COREPACK_ROOT="${COREPACK_ROOT:-}"

# This script updates all JS lock files in the repository.
find . -name node_modules -prune -o -name yarn.lock -print0 \
  | while IFS= read -r -d $'\0' lockfile; do
    dir="$(dirname "$lockfile")"
    echo "Updating $lockfile"
    (
      cd "$dir"
      "${COREPACK_SHIMS}yarn" install
    )
  done
echo "All yarn.lock files updated."
