#!/usr/bin/env bash
set -euo pipefail

# We intentionally install hooks directly instead of using a hook manager.
# Managers add dependency/runtime overhead, and most rely on package-manager
# lifecycle hooks (for example `prepare`) to auto-install. This repo sets
# `enableScripts: false` in `.yarnrc.yml` for security, so lifecycle-based
# installation is not reliable here.
#
# Hooks live in the tracked scripts/git-hooks/ directory. We point
# `core.hooksPath` at that directory instead of generating a shim under
# .git/hooks. The value is repo-relative, so each worktree resolves to its own
# checkout's hooks, and it is set in local (not global) config, so it does not
# affect the developer's other repositories. Because the hooks are tracked,
# changing what they do is a normal commit -- developers only need to re-run
# this script when this installation contract itself changes.

repo_root=$(git rev-parse --show-toplevel)
hooks_dir_rel="scripts/git-hooks"
hooks_dir="$repo_root/$hooks_dir_rel"

# core.hooksPath requires the hook entry point to be executable. A checkout can
# drop the bit, so re-assert it.
chmod +x "$hooks_dir/pre-commit"

git config core.hooksPath "$hooks_dir_rel"

# Migration cleanup: older installs generated a shim at <git-common-dir>/hooks/
# pre-commit that exec'd the now-deprecated pre-commit-dprint.sh. With
# core.hooksPath set that shim is bypassed, but remove it so nothing references
# the old script. We resolve the *default* hooks location via --git-common-dir
# (shared across worktrees) rather than --git-path, which would follow the
# core.hooksPath we just set and point back at this repo's tracked hook.
git_common_dir=$(cd "$repo_root" && git rev-parse --git-common-dir)
[[ "$git_common_dir" = /* ]] || git_common_dir="$repo_root/$git_common_dir"
legacy_shim="$git_common_dir/hooks/pre-commit"
if [[ -f "$legacy_shim" ]] && grep -q 'pre-commit-dprint.sh' "$legacy_shim" 2>/dev/null; then
  rm -f "$legacy_shim"
  echo "Removed legacy $legacy_shim shim (it referenced pre-commit-dprint.sh)."
fi

echo "Installed git hooks via core.hooksPath -> $hooks_dir_rel"
echo
cat <<'EOF'
Want your own hook *in addition* to the repo's? Git's config-based hooks
(requires git >= 2.54) run alongside the repo's hooks without editing tracked
files. For example, to add a personal pre-commit step:

    git config --add hook.my-check.event pre-commit
    git config --add hook.my-check.command /absolute/path/to/your/script

Your hook runs first, then the repo's pre-commit hook. Inspect what's wired up
with 'git hook list pre-commit'; older git silently ignores hook.* config, so
upgrade to 2.54+ if your personal hook does not run.
EOF
