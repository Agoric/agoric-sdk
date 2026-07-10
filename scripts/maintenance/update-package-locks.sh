#! /bin/bash
set -ueo pipefail

COMMAND="${1:-"install"}"

# cd to the repo root (this script lives in scripts/maintenance/).
cd "$(dirname -- "$(readlink -f -- "$0")")/../.."

# Check if COREPACK_ROOT is set, which means we need to explicitly
# use the corepack shims from it (otherwise recursive calls to
# just "yarn" will fail).
if test "${COREPACK_ROOT+set}" = set; then
  COREPACK_SHIMS="$COREPACK_ROOT/shims/"
else
  COREPACK_SHIMS=
fi

COREPACK_ROOT="${COREPACK_ROOT:-}"

# XXX: Tech debt. We currently piggyback on update-package-locks to refresh
# a3p local vendored package files instead of having a dedicated sync command.
echo "Refreshing a3p local-packages files via prepare-test.sh"
(
  cd a3p-integration
  ./scripts/prepare-test.sh
)
echo "a3p local-packages files refreshed."

ROOT_PM="$(jq --raw-output '.packageManager // empty' package.json)"
STAGING_BASE="$(mktemp -d)"
trap 'rm -rf "$STAGING_BASE"' EXIT

# This script updates all JS lock files in the repository.
find . -name node_modules -prune -o -name yarn.lock -print0 \
  | while IFS= read -r -d $'\0' lockfile; do
    dir="$(dirname "$lockfile")"
    if [ "$dir" = ./packages/create-dapp/demo ]; then
      echo "Skipping $lockfile"
      continue
    fi
    echo "Updating $lockfile"
    dir_pm="$(jq --raw-output '.packageManager // empty' "$dir/package.json" 2> /dev/null)"
    if test -n "$dir_pm" && test "$dir_pm" != "$ROOT_PM"
    then
      # This project pins a different Yarn than the repo (the a3p proposals
      # pin the synthetic-chain container's version, which writes an older
      # lockfile format). Running the repo's yarnPath here would rewrite the
      # lock in the wrong format, and running the pinned Yarn in-tree fails
      # on root .yarnrc.yml settings that predate it. Stage a copy outside
      # the repo — mirroring the container layout, where ../../agoric-sdk
      # resolves to the repo checkout — and refresh the lock there with the
      # pinned Yarn via corepack.
      staging="$STAGING_BASE/$dir"
      mkdir -p "$staging"
      # The proposals' workspace portals point at ../../agoric-sdk (the
      # container layout); recreate that anchor two levels above the staged
      # project as a symlink to this checkout.
      ln -fns "$(pwd)" "$STAGING_BASE/$(dirname "$(dirname "$dir")")/agoric-sdk"
      rsync -a --exclude node_modules "$dir/" "$staging/"
      (
        cd "$staging"
        YARN_IGNORE_PATH=1 "${COREPACK_SHIMS}yarn" "$COMMAND"
      )
      cp "$staging/yarn.lock" "$dir/yarn.lock"
    else
      (
        cd "$dir"
        "${COREPACK_SHIMS}yarn" "$COMMAND"
      )
    fi
  done
echo "All yarn.lock files updated."
