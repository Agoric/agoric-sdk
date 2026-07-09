#!/bin/bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/change/clean-commits.sh [--rebase-merges] <upstream>

Rebase commits onto <upstream>, and for each commit:
- run `yarn prettier --write` on files touched by that commit
- amend the commit if formatting changes occurred

Examples:
  scripts/change/clean-commits.sh origin/main
  scripts/change/clean-commits.sh --rebase-merges main
USAGE
}

rebase_merges=false
upstream=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --rebase-merges)
      rebase_merges=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -* )
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -z "$upstream" ]]; then
        upstream="$1"
        shift
      else
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 2
      fi
      ;;
  esac
done

if [[ -z "$upstream" ]]; then
  usage >&2
  exit 2
fi

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo "Not inside a git repository" >&2
  exit 1
}
cd "$root"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Working tree not clean. Please commit, stash, or discard changes first." >&2
  exit 1
fi

tmp_exec=$(mktemp -t clean-commits.XXXXXX)
cat >"$tmp_exec" <<'EXEC'
#!/bin/bash
set -euo pipefail

files=()
while IFS= read -r -d '' f; do
  files+=("$f")
done < <(git diff-tree --diff-filter=ACMRT --no-commit-id --name-only -r -z HEAD)

if [[ "${#files[@]}" -eq 0 ]]; then
  exit 0
fi

yarn prettier --write --ignore-unknown "${files[@]}"

if ! git diff --quiet; then
  git add -- "${files[@]}"
  git commit --amend --no-edit --no-verify
fi
EXEC
chmod +x "$tmp_exec"
trap 'rm -f "$tmp_exec"' EXIT

rebase_args=(--exec "$tmp_exec")
if [[ "$rebase_merges" == "true" ]]; then
  rebase_args=(--rebase-merges "${rebase_args[@]}")
fi

git rebase "${rebase_args[@]}" "$upstream"
