#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

###############################################################################
# Worktree setup
#
# Purpose
# -------
# Speed up agent startup when a new Git worktree is created.
#
# Instead of running:
#
#   yarn install
#   yarn build
#
# we reuse dependencies and build artifacts from an existing worktree when
# possible.
#
# Safety
# ------
# node_modules is reused only when yarn.lock is identical.
#
# Performance
# -----------
# Use filesystem copy-on-write cloning when available:
#
#   macOS (APFS)    → cp -c
#   Linux           → cp --reflink=auto
#   fallback        → cp
#
# Copy-on-write cloning makes the copy essentially free and keeps the
# worktrees isolated if files later change.
###############################################################################

echo "worktree setup starting..."

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
OS="$(uname)"
ROOT="$(git rev-parse --show-toplevel)"
VOID="/dev/null"

COWSYNC_BIN="${COWSYNC_BIN:-$VOID}"

if command -v perl > "$VOID" 2>&1
then
  now_ms() {
    perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)'
  }
elif [[ "$(date +%s%3N 2> "$VOID")" =~ ^[0-9]+$ ]]
then
  now_ms() {
    date +%s%3N
  }
else
  now_ms() {
    echo $(($(date +%s) * 1000))
  }
fi

SETUP_START_MS="$(now_ms)"

# Porcelain lines are `worktree <path>`; strip the prefix rather than split on
# whitespace so paths containing spaces survive.
PRIMARY="$(git worktree list --porcelain | awk '
/^worktree / {
  sub(/^worktree /, "")
  print
  exit
}')"

###############################################################################
# Determine fastest copy command
###############################################################################

clone() {
  local src="$1"
  local dst="$2"

  if test "$OS" = "Darwin"
  then
    cp -c -R "$src" "$dst" 2> "$VOID" || cp -R "$src" "$dst"
  else
    cp --recursive --reflink=auto "$src" "$dst" 2> "$VOID" || cp -R "$src" "$dst"
  fi
}

# The pre-worktree-reuse setup contract: a worktree that cannot reuse another
# worktree's artifacts must still come up fully installed and built.
install_and_build() {
  phase_start "yarn install"
  yarn install
  phase_end
  phase_start "yarn build"
  yarn build
  phase_end
}

phase_end() {
  local elapsed_ms
  local end_ms

  end_ms="$(now_ms)"
  elapsed_ms=$((end_ms - PHASE_START_MS))
  echo "phase done: $PHASE_NAME (${elapsed_ms}ms)"
}

phase_start() {
  PHASE_NAME="$1"
  PHASE_START_MS="$(now_ms)"
  echo "phase start: $PHASE_NAME"
}

sync_with_cowsync() {
  "$COWSYNC_BIN" "$@"
}

###############################################################################
# Find another worktree on the same branch
###############################################################################

phase_start "select source worktree"
# BRANCH and ROOT enter via -v so they stay data: a branch name containing awk
# syntax (quotes etc.) cannot alter the program, and paths with spaces survive.
SOURCE="$(git worktree list --porcelain | awk -v branch="$BRANCH" -v root="$ROOT" '
/^worktree / {
  path = $0
  sub(/^worktree /, "", path)
}
/^branch / {
  ref = $0
  sub(/^branch refs\/heads\//, "", ref)
  if (ref == branch && path != root) {
    print path
    exit
  }
}')"

# fallback to primary checkout
if test -z "$SOURCE"
then
  SOURCE="$PRIMARY"
fi
phase_end

# nothing to do if we are the source
if test "$SOURCE" = "$ROOT"
then
  echo "primary worktree detected"
  exit 0
fi

###############################################################################
# Ensure dependency compatibility
###############################################################################

phase_start "compare yarn.lock"
if ! cmp --silent "$SOURCE/yarn.lock" "$ROOT/yarn.lock"
then
  phase_end
  echo "yarn.lock differs → cannot reuse artifacts; falling back to full setup"
  install_and_build
  exit 0
fi
phase_end

###############################################################################
# Reuse dependencies
###############################################################################

if test -d "$SOURCE/node_modules" && ! test -d "$ROOT/node_modules"
then
  phase_start "copy node_modules"
  echo "reusing node_modules"
  if test -x "$COWSYNC_BIN"
  then
    sync_with_cowsync --include 'node_modules/**' "$SOURCE" "$ROOT"
  else
    clone "$SOURCE/node_modules" "$ROOT/node_modules"
  fi
  phase_end
fi

# Reuse was not possible (e.g. the source worktree itself was never installed).
# There are no artifacts worth copying from such a source, so fall back to the
# full setup this script replaces.
if ! test -d "$ROOT/node_modules"
then
  echo "no reusable node_modules → falling back to full setup"
  install_and_build
  exit 0
fi

###############################################################################
# Copy all build caches
###############################################################################

echo "copying build caches..."

if test -x "$COWSYNC_BIN"
then
  phase_start "copy build caches"
  sync_with_cowsync \
    --include '**/*.tsbuildinfo' \
    --include 'packages/**/dist/**' \
    --include 'packages/**/bundles/**' \
    "$SOURCE" \
    "$ROOT"
  phase_end
else
  # TypeScript incremental caches. Prune node_modules (already cloned above,
  # and by far the largest tree to walk) and .git.
  phase_start "copy tsbuildinfo"
  find "$SOURCE" \( -name .git -o -name node_modules \) -prune -o \
    -name "*.tsbuildinfo" -type f -print 2> "$VOID" | \
  while read -r f
  do
    rel="${f#"$SOURCE/"}"
    mkdir -p "$(dirname "$ROOT/$rel")"
    clone "$f" "$ROOT/$rel"
  done
  phase_end

  # dist and bundles directories
  phase_start "copy dist and bundles directories"
  find "$SOURCE/packages" -name node_modules -prune -o \
    -type d \( -name dist -o -name bundles \) -print 2> "$VOID" | \
  while read -r d
  do
    rel="${d#"$SOURCE/"}"
    # `cp -R dir existing-dir` copies INTO the destination (nesting dist/dist),
    # so skip destinations that already exist to keep reruns idempotent.
    if test -e "$ROOT/$rel"
    then
      continue
    fi
    mkdir -p "$(dirname "$ROOT/$rel")"
    clone "$d" "$ROOT/$rel"
  done
  phase_end
fi

SETUP_END_MS="$(now_ms)"
echo "worktree setup complete ($((SETUP_END_MS - SETUP_START_MS))ms total)"
