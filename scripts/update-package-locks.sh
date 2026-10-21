#! /bin/bash
set -ueo pipefail

COMMAND=${1:-install}

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

update_lockfile() {
  lockfile="$1"
  dir="$(dirname "$lockfile")"
  if [ "$dir" = ./packages/create-dapp/demo ]; then
    echo "Skipping $lockfile"
    return
  fi
  echo "Updating $lockfile"
  (
    cd "$dir"
    "${COREPACK_SHIMS}yarn" $COMMAND
  )
}

# Update the root install first because a3p local-package vendoring copies from
# root node_modules.
update_lockfile ./yarn.lock

# XXX: Tech debt. We currently piggyback on update-package-locks to refresh
# a3p local vendored package files instead of having a dedicated sync command.
echo "Refreshing a3p local-packages files via prepare-test.sh"
(
  cd a3p-integration
  ./scripts/prepare-test.sh
)
echo "a3p local-packages files refreshed."

# This script updates all remaining JS lock files in the repository.
find . -name node_modules -prune -o -name yarn.lock -print0 \
  | while IFS= read -r -d $'\0' lockfile; do
    if [ "$lockfile" = ./yarn.lock ]; then
      continue
    fi
    update_lockfile "$lockfile"
  done
echo "All yarn.lock files updated."
