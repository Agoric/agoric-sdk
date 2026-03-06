#!/usr/bin/env bash
set -euo pipefail

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

ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SETUP_START_MS=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)')
PRIMARY=$(git worktree list --porcelain | awk '
/^worktree / {
  print $2
  exit
}')

phase_start() {
  PHASE_NAME="$1"
  PHASE_START_MS=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)')
  echo "phase start: $PHASE_NAME"
}

phase_end() {
  local end_ms elapsed_ms
  end_ms=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)')
  elapsed_ms=$((end_ms - PHASE_START_MS))
  echo "phase done: $PHASE_NAME (${elapsed_ms}ms)"
}

###############################################################################
# Find another worktree on the same branch
###############################################################################

phase_start "select source worktree"
SOURCE=$(git worktree list --porcelain | awk '
/^worktree / { path=$2 }
/^branch / {
  sub("refs/heads/","",$2)
  if ($2 == "'"$BRANCH"'" && path != "'"$ROOT"'") {
    print path
    exit
  }
}')

# fallback to primary checkout
if [ -z "$SOURCE" ]; then
  SOURCE="$PRIMARY"
fi
phase_end

# nothing to do if we are the source
if [ "$SOURCE" = "$ROOT" ]; then
  echo "primary worktree detected"
  exit 0
fi

###############################################################################
# Ensure dependency compatibility
###############################################################################

phase_start "compare yarn.lock"
if ! cmp -s "$SOURCE/yarn.lock" "$ROOT/yarn.lock"; then
  phase_end
  phase_start "yarn install"
  echo "yarn.lock differs → running yarn install"
  yarn install
  phase_end
  exit 0
fi
phase_end

###############################################################################
# Determine fastest copy command
###############################################################################

OS=$(uname)

clone() {
  src="$1"
  dst="$2"

  if [ "$OS" = "Darwin" ]; then
    cp -cR "$src" "$dst" 2>/dev/null || cp -R "$src" "$dst"
  else
    cp -R --reflink=auto "$src" "$dst" 2>/dev/null || cp -R "$src" "$dst"
  fi
}

###############################################################################
# Reuse dependencies
###############################################################################

if [ -d "$SOURCE/node_modules" ] && [ ! -d "$ROOT/node_modules" ]; then
  phase_start "copy node_modules"
  echo "reusing node_modules"
  clone "$SOURCE/node_modules" "$ROOT/node_modules"
  phase_end
fi

###############################################################################
# Copy all build caches
###############################################################################

echo "copying build caches..."

# TypeScript incremental caches
phase_start "copy tsbuildinfo"
find "$SOURCE" -name "*.tsbuildinfo" -type f 2>/dev/null | while read -r f; do
  rel=${f#"$SOURCE/"}
  mkdir -p "$(dirname "$ROOT/$rel")"
  clone "$f" "$ROOT/$rel"
done
phase_end

# dist and bundles directories
phase_start "copy dist and bundles directories"
find "$SOURCE/packages" \( -type d -name dist -o -type d -name bundles \) 2>/dev/null | while read -r d; do
  rel=${d#"$SOURCE/"}
  mkdir -p "$(dirname "$ROOT/$rel")"
  clone "$d" "$ROOT/$rel"
done
phase_end

SETUP_END_MS=$(perl -MTime::HiRes=time -e 'printf("%.0f\n", time() * 1000)')
echo "worktree setup complete ($((SETUP_END_MS - SETUP_START_MS))ms total)"
