#! /bin/bash
# 3-way-merge changes from current repo to agoric-sdk/golang/cosmos
#
# Usage: ./upgradegaia.sh <FROM_BRANCH> <TO_BRANCH>
# Such as:
#  cd ~/src/gaia
#  /path/to/agoric-sdk/golang/cosmos/upgradegaia.sh release/v6.0.0-rc3 release/v6.0.0
set -ueo pipefail

test $# -eq 2 || {
  echo "Usage: $0 <FROM_BRANCH> <TO_BRANCH>" 1>&2
  exit 1
}

FROM_BRANCH="$1"
TO_BRANCH="$2"

thisdir="$(cd "$(dirname "${BASH_SOURCE[0]}")" > /dev/null && pwd)"
tmp="$(mktemp -dt upgradegaia.XXXXXX)"

echo "Get the Gaia files from $FROM_BRANCH and $TO_BRANCH"
for tag in "$FROM_BRANCH" "$TO_BRANCH"; do
  qtag=${tag//\//_}
  for root in Makefile app cmd/gaiad; do
    case "$root" in
      Makefile) echo "$root" ;;
      *) git ls-tree --name-only --full-tree -r "$tag:$root" | sed -e "s!^!$root/!" ;;
    esac
  done | while read -r src; do
    # echo "$src"
    dst="$tmp/$qtag/$src"
    echo "extracting $dst"
    mkdir -p "$(dirname "$dst")"
    git cat-file blob "$tag:$src" > "$dst"
  done
done

echo "Compute 3-way diffs between Gaia and us"
(cd "$tmp/${FROM_BRANCH//\//_}" && find . -type f -print) \
  | while read -r src; do
    # echo "$src"
    case "$src" in
      ./cmd/gaiad/*) our=${src//cmd\/gaiad/daemon} ;;
      *) our=$src ;;
    esac

    new="$tmp/diff3/$our"
    echo "creating $new"
    mkdir -p "$(dirname "$new")"
    status=0
    ourfile="$thisdir/$our"
    if [ ! -f $ourfile ]; then
      ourfile=/dev/null
    fi
    fromfile="$tmp/${FROM_BRANCH//\//_}/$src"
    if [ ! -f $fromfile ]; then
      fromfile=/dev/null
    fi
    tofile="$tmp/${TO_BRANCH//\//_}/$src"
    if [ ! -f $tofile ]; then
      tofile=/dev/null
    fi
    diff3 -mE "$ourfile" "$fromfile" "$tofile" \
      > "$new" || status=$?
    if [ $status -ge 2 ]; then
      exit "$status"
    fi
  done

# Display some hints.
echo "=== Now you can run:"
set -x
: cp -a "$tmp/diff3/." "$thisdir/"
: git diff --stat
: git commit -am "Upgrade to \`$TO_BRANCH\`"
