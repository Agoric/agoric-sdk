#!/usr/bin/env bash
set -euo pipefail

# DEPRECATED back-compat stub.
#
# Hooks moved to a tracked core.hooksPath (scripts/git-hooks), and the
# pre-commit logic now lives in scripts/git-hooks/pre-commit. This script is no
# longer part of the active hook chain.
#
# If you are seeing this message, your local .git/hooks/pre-commit is a stale
# shim left over from the old install that still exec's this file. Re-run the
# installer to migrate to core.hooksPath:
#
#   scripts/install-git-hooks.sh
#
echo "pre-commit: your git hooks are out of date." >&2
echo "pre-commit: run 'scripts/install-git-hooks.sh' to update them, then commit again." >&2
exit 1
