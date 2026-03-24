#!/usr/bin/env bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

staged_files=()
while IFS= read -r -d '' file; do
  staged_files+=("$file")
done < <(
  git diff --cached --name-only --diff-filter=ACMR -z -- \
    '*.js' '*.jsx' '*.cjs' '*.mjs' '*.ts' '*.tsx' '*.cts' '*.mts'
)

if [[ ${#staged_files[@]} -eq 0 ]]; then
  exit 0
fi

dprint_bin='./node_modules/.bin/dprint'
if [[ ! -x "$dprint_bin" ]]; then
  echo "pre-commit: missing local dprint binary at $dprint_bin" >&2
  echo "Run 'yarn install' to provision dev dependencies." >&2
  exit 1
fi

echo "pre-commit: formatting ${#staged_files[@]} staged file(s) with local dprint"
"$dprint_bin" fmt -- "${staged_files[@]}"
git add -- "${staged_files[@]}"
