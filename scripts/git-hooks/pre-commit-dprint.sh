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

dprint_bin="$repo_root/node_modules/.bin/dprint"
if [[ ! -x "$dprint_bin" ]]; then
  echo "pre-commit: missing local dprint binary at $dprint_bin" >&2
  echo "Run 'yarn install' to provision dev dependencies." >&2
  exit 1
fi

auto_add_files=()
manual_review_files=()
for file in "${staged_files[@]}"; do
  # Only auto-add files that were already clean relative to the index.
  # If the file had unstaged hunks, re-adding it would pull those hunks into
  # the commit and break partial staging.
  if git diff --quiet -- "$file"; then
    auto_add_files+=("$file")
  else
    manual_review_files+=("$file")
  fi
done

"$dprint_bin" fmt -- "${staged_files[@]}"

if [[ ${#auto_add_files[@]} -gt 0 ]]; then
  git add -- "${auto_add_files[@]}"
fi

changed_files=()
if [[ ${#manual_review_files[@]} -gt 0 ]]; then
  while IFS= read -r -d '' file; do
    changed_files+=("$file")
  done < <(
    git diff --name-only -z -- "${manual_review_files[@]}"
  )
fi

if [[ ${#changed_files[@]} -eq 0 ]]; then
  exit 0
fi

echo "pre-commit: dprint reformatted staged file(s); please review and restage:" >&2
printf '  %s\n' "${changed_files[@]}" >&2
exit 1
