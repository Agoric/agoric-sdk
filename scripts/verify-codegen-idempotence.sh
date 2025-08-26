#!/usr/bin/env bash

set -euo pipefail

# Ensure we run from the repository root if possible
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

echo "Discovering packages with a codegen script..."
mapfile -t PACKAGES < <(node -e '
  const fs = require("fs");
  const path = require("path");
  const root = path.join(process.cwd(), "packages");
  if (!fs.existsSync(root)) process.exit(0);
  for (const name of fs.readdirSync(root)) {
    const pkgPath = path.join(root, name, "package.json");
    try {
      if (!fs.existsSync(pkgPath)) continue;
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.scripts && pkg.scripts.codegen) {
        console.log(path.join("packages", name));
      }
    } catch {}
  }
')

if [[ ${#PACKAGES[@]} -eq 0 ]]; then
  echo "No packages with codegen script found."
  exit 0
fi

echo "Found packages: ${PACKAGES[*]}"

for pkg in "${PACKAGES[@]}"; do
  echo "Running yarn codegen in $pkg"
  (cd "$pkg" && yarn codegen)

  echo "Checking for unexpected changes after $pkg codegen..."
  if bash ./.github/actions/restore-node/check-git-status.sh . false; then
    echo "No changes detected after $pkg codegen."
  else
    echo "Changes detected after $pkg codegen."
    echo "Please run 'yarn codegen' in $pkg and commit the results."
    git status --porcelain
    exit 1
  fi
done

