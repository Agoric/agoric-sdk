#! /bin/bash

usage() {
  cat << END_USAGE
Usage:
$0 [--dry-run] [lerna] add <tag> [-<pre-release>]
  Add <tag> to package dist-tags for current version or specified <pre-release>.
$0 [--dry-run] [lerna] <remove|rm> <tag>
  Remove <tag> from package dist-tags.
$0 [--dry-run] [lerna] <list|ls> [<tag>]
  List package dist-tags, or just the one named <tag>.

With "--dry-run", npm commands are printed to standard error rather than executed.

If the first operand is "lerna", the operation is extended to all packages.
END_USAGE
  exit 1
}

# fail <error message>
fail() {
  printf '%s\n\n' "$1"
  usage
} 1>&2

# Exit on any errors.
set -ueo pipefail

# Check for `--dry-run`.
npm=npm
dryrun=
if test "${1:-}" = "--dry-run"; then
  dryrun=$1
  npm="echo-to-stderr $npm"
  shift
fi
echo-to-stderr() { echo "$@"; } 1>&2

# Check the first argument.
case "${1-}" in
  lerna)
    # npm-dist-tag.sh lerna [args]...
    # Run `npm-dist-tag.sh [args]...` in every package directory.

    # Find the absolute path to this script.
    thisdir=$(cd "$(dirname -- "${BASH_SOURCE[0]}")" > /dev/null && pwd -P)
    thisprog=$(basename -- "${BASH_SOURCE[0]}")

    doit() {
      npm run -- lerna --loglevel silent exec --concurrency=1 --no-bail "$thisdir/$thisprog" -- $dryrun ${1+"$@"}
    }

    # Strip the first argument (`lerna`), so that `$@` gives us remaining args.
    shift
    if test "${1-}" = "--json"; then
      shift
      doit ${1+"$@"} | {
        echo '{'
        sed -e '/^$/,/^$/d; s/^\(.*\)@\(.*\)$/  "\1": "\2",/; $s/,$//;'
        echo '}'
      }
    else
      doit ${1+"$@"}
    fi
    exit $?
    ;;
esac

# If the package.json says it's private, we don't have a published version whose
# tags we can manipulate.
priv=$(jq -r .private package.json)
case "$priv" in
  true)
    echo 1>&2 "Skipping $(basename "$0") for private package $(jq .name package.json)"
    exit 0
    ;;
esac

# Get the second argument, if any.
TAG=${2-}

# Read package.json for the package name and current version.
pkg=$(jq -r .name package.json)
case ${3-} in
  -*)
    # Instead of current package version, reference an already-published version
    # with the specified pre-release suffix.
    version=$(npm view "$pkg" versions --json \
      |
      # cf. https://semver.org/#backusnaur-form-grammar-for-valid-semver-versions
      jq --arg s "$3" -r '.[] | select(sub("^((^|[.])(0|[1-9][0-9]*)){3}"; "") == $s)' || true)
    ;;
  *)
    test "$#" -le 2 || fail "Invalid pre-release suffix!"
    version=$(jq -r .version package.json)
    ;;
esac

case "${1-}" in
  add)
    # Add $TAG to the current-directory package's dist-tags.
    test -n "$TAG" || fail "Missing tag!"
    test "$#" -le 3 || fail "Too many arguments!"
    $npm dist-tag add "$pkg@$version" "$TAG"
    ;;
  remove | rm)
    # Remove $TAG from the current-directory package's dist-tags.
    test -n "$TAG" || fail "Missing tag!"
    test "$#" -le 2 || fail "Too many arguments!"
    $npm dist-tag rm "$pkg" "$TAG"
    ;;
  list | ls)
    # List the current-directory package's dist-tags, or just the specific $TAG.
    test "$#" -le 2 || fail "Too many arguments!"
    if test -n "$TAG"; then
      if test -n "$dryrun"; then
        # Print the entire pipeline.
        $npm dist-tag ls "$pkg" \| sed -ne "s/^$TAG: //p"
      else
        vsn=$($npm dist-tag ls "$pkg" | sed -ne "s/^$TAG: //p")
        test -z "$vsn" || echo "$pkg@$vsn"
      fi
    else
      $npm dist-tag ls "$pkg"
    fi
    ;;
  *)
    test "${1-"--help"}" = "--help" || fail "Bad command!"
    usage
    ;;
esac
