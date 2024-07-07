#! /bin/bash
usage() {
  cat << END_USAGE
Usage: $0 [--dry-run|--otp-stream=<fifo>] [lerna] <command> [<argument>]...

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

With "--otp-stream=<fifo>", for each npm command the value  of an "--otp" option
is read from the specified file (generally expected to be a named pipe created
by \`mkfifo\`) and failing commands are retried until the read value is empty.
Alternatively, environment variable configuration \`npm_config_auth_type=legacy\`
causes npm itself to prompt for and read OTP values from standard input.

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

# Check for `--dry-run` and `--otp-stream`.
npm=npm
style=
otpfile=
case "${1:-}" in
  --dry-run)
    style="$1"
    npm="echo-to-stderr npm"
    shift
    ;;
  --otp-stream=*)
    style="$1"
    otpfile="${1##--otp-stream=}"
    npm="npm-otp"
    shift
    ;;
esac
echo-to-stderr() { echo "$@"; } 1>&2
npm-otp() {
  printf 1>&2 "Reading OTP from %s ... " "$otpfile"
  otp=$(head -n 1 "$otpfile")
  if test -z "$otp"; then
    echo 1>&2 "No OTP"
    return 66
  fi
  echo 1>&2 OK
  npm --otp="$otp" "$@"
}

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
    exec npm run -- lerna exec --concurrency=1 --no-bail -- "$thisdir/$thisprog" "$style" "$@"
    ;;
esac
CMD="${1-"--help"}"

# Read current-directory package.json fields "name"/"version"/"private" into shell variables
# by evaluating single-quoted assignments like `<name>='...'`.
eval "$(jq < package.json -r --arg Q "'" '
  pick(.name, .version, .private)
  | to_entries
  | .[]
  # Replace a null/false value with empty string.
  | ((.value // "") | tostring) as $str_value
  # Enclosing single-quote `$Q`s preserve the literal value of each character
  # except actual single-quotes, which are replaced with an escape sequence by
  # the `gsub`.
  | (.key + "=" + $Q + ($str_value | gsub($Q; $Q + "\\" + $Q + $Q)) + $Q)
')"

# dist-tags are only applicable to published packages.
if test "$private" = true -a "$CMD" != "--help"; then
  echo 1>&2 "Skipping private package $name"
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

    version=$(npm view "$name" versions --json \
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
    while true; do
      $npm dist-tag add "$name@$version" "$TAG" && break || ret=$?
      [[ "$style" =~ --otp-stream ]] || exit $ret
      [ $ret -ne 66 ] && continue
      echo Aborting
      exit 1
    done
    ;;
  remove | rm)
    # Remove $TAG from dist-tags.
    test -n "$TAG" || fail "Missing tag!"
    test "$#" -le 2 || fail "Too many arguments!"
    while true; do
      $npm dist-tag rm "$name" "$TAG" && break || ret=$?
      [[ "$style" =~ --otp-stream ]] || exit $ret
      [ $ret -ne 66 ] && continue
      echo Aborting
      exit 1
    done
    ;;
  list | ls)
    # List either all dist-tags or just the specific $TAG.
    test "$#" -le 2 || fail "Too many arguments!"
    if test -n "$TAG"; then
      if test "$style" = "--dry-run"; then
        # Print the entire pipeline.
        $npm dist-tag ls "$name" \| awk -vP="$TAG" -F: '$1==P'
      else
        $npm dist-tag ls "$name" | awk -vP="$TAG" -F: '$1==P'
      fi
    else
      $npm dist-tag ls "$name"
    fi
    ;;
  *)
    test "$CMD" = "--help" || fail "Bad command!"
    usage
    ;;
esac
