#! /bin/bash
usage() {
  cat << END_USAGE
Usage: $0 [--dry-run] [lerna] <command> [<argument>]...

Commands:
add <tag> [-<pre-release>]
  Read package name and version from package.json and add <tag> to its dist-tags
  on npm for either that version or version x.y.z-<pre-release>.
<remove|rm> <tag>
  Read package name from package.json and remove <tag> from its dist-tags on npm.
<list|ls> [<tag>]
  Read package name from package.json and list its dist-tag mappings from npm
  (optionally limited to the dist-tag named <tag>).

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
  npm="echo-to-stderr npm"
  shift
fi
echo-to-stderr() { echo "$@"; } 1>&2

# Check for `lerna`.
case "${1-}" in
  lerna)
    # npm-dist-tag.sh lerna [arg]...
    # Run `npm-dist-tag.sh [arg]...` in every package directory.

    # Find the absolute path to this script.
    thisdir=$(cd "$(dirname -- "${BASH_SOURCE[0]}")" > /dev/null && pwd -P)
    thisprog=$(basename -- "${BASH_SOURCE[0]}")
    cd "$thisdir"

    # Strip the first argument (`lerna`), so that `$@` gives us remaining args.
    shift
    exec npm run -- lerna exec --concurrency=1 --no-bail -- "$thisdir/$thisprog" "$dryrun" "$@"
    ;;
esac
CMD="${1-"--help"}"

# Read current-directory package.json data into shell variables: pkg, version, priv.
eval "$(jq < package.json -r --arg Q "'" '
  pick(.name, .version, .private)
  | to_entries
  | .[]
  | ({ name: "pkg", private: "priv" }[.key] // .key) as $key
  | ((.value // "") | tostring | gsub($Q; $Q + "\\" + $Q + $Q)) as $value
  | ($key + "=" + $Q + $value + $Q)
')"

# dist-tags are only applicable to published packages.
if test "$priv" = true -a "$CMD" != "--help"; then
  echo 1>&2 "Skipping private package $pkg"
  exit 0
fi

# Process command arguments: [<tag> [-<pre-release>]].
TAG="${2-}"
case ${3-} in
  -*)
    # "add <tag> -<pre-release>" scans published versions for an exact match of
    # the specified pre-release suffix and applies the new dist-tag to that
    # version rather than to the version read from package.json.

    # cf. https://semver.org/#backusnaur-form-grammar-for-valid-semver-versions
    semver_prefix="^((^|[.])(0|[1-9][0-9]*)){3}"

    version=$(npm view "$pkg" versions --json \
      | jq --arg p "$semver_prefix" --arg suffix "$3" -r '.[] | select(sub($p; "") == $suffix)' \
      | tail -n 1)
    ;;
  *)
    test "$#" -le 2 || fail "Invalid pre-release suffix!"
    ;;
esac

case "$CMD" in
  add)
    # Add $TAG to dist-tags.
    test -n "$TAG" || fail "Missing tag!"
    test "$#" -le 3 || fail "Too many arguments!"
    $npm dist-tag add "$pkg@$version" "$TAG"
    ;;
  remove | rm)
    # Remove $TAG from dist-tags.
    test -n "$TAG" || fail "Missing tag!"
    test "$#" -le 2 || fail "Too many arguments!"
    $npm dist-tag rm "$pkg" "$TAG"
    ;;
  list | ls)
    # List either all dist-tags or just the specific $TAG.
    test "$#" -le 2 || fail "Too many arguments!"
    if test -n "$TAG"; then
      if test -n "$dryrun"; then
        # Print the entire pipeline.
        $npm dist-tag ls "$pkg" \| awk -vP="$TAG" -F: '$1==P'
      else
        $npm dist-tag ls "$pkg" | awk -vP="$TAG" -F: '$1==P'
      fi
    else
      $npm dist-tag ls "$pkg"
    fi
    ;;
  *)
    test "$CMD" = "--help" || fail "Bad command!"
    usage
    ;;
esac
