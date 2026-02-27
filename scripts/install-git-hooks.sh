#!/usr/bin/env bash
set -euo pipefail

# We intentionally install hooks directly instead of using a hook manager.
# Managers add dependency/runtime overhead, and most rely on package-manager
# lifecycle hooks (for example `prepare`) to auto-install. This repo sets
# `enableScripts: false` in `.yarnrc.yml` for security, so lifecycle-based
# installation is not reliable here.

repo_root=$(git rev-parse --show-toplevel)
hook_dir="$repo_root/.git/hooks"
hook_file="$hook_dir/pre-commit"

mkdir -p "$hook_dir"
cat >"$hook_file" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
exec "$repo_root/scripts/git-hooks/pre-commit-dprint.sh"
EOF

chmod +x "$hook_file"
echo "Installed pre-commit hook at .git/hooks/pre-commit"
