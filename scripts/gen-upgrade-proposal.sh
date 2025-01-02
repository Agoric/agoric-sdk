#! /bin/bash
set -ueo pipefail
# shellcheck disable=SC2016 # intentionally escape `agd tx`
declare -r USAGE="Usage: $0"' \
  [<option>]... [--send] \
  [<target ref>] \
  [--] [<agd tx argument>]...

Generate and optionally issue an `agd tx` command for making a software-upgrade
governance proposal to bring the nodes of an Agoric blockchain up to the state
of GitHub repository Agoric/agoric-sdk at a particular release or commit
identified by checking the following in order:
1. [remote] Latest Release: If the specified target is "latest" and there is at
   least one non-prerelease non-draft GitHub release, its target tag name.
2. [remote] Named Release: If the specified target is the name of a GitHub
   release, its target tag name.
3. [remote] Remote Ref: If the specified target is a valid git rev such as a
   commit ID or tag name or branch name, the commit currently identified by it.
4. [local] Local Ref: If the working directory is part of a git repository
   (presumably agoric-sdk) and the specified target is a valid git rev, the
   commit currently identified by it.
5. [local] Local Head: If no target is specified and the working directory is
   part of a git repository, the commit currently identified by HEAD.

OPTIONS
  -h, --help
    Output this usage information.
  -m {local|remote|any}, --mode={local|remote|any}
    "local" omits [remote] checks; "remote" omits [local] checks.
    Note that some required arguments (such as upgrade name) can only be
    determined from a [remote] release created using gen-github-release.sh.
  -u UPGRADE_NAME, --upgrade-name=UPGRADE_NAME
    Force use of the specified upgrade name.
  -s, --send
    Invoke `agd tx` to send the proposal, rather than just printing out the
    command to do so (additionally requires `--from` etc.).

ENVIRONMENT VARIABLES
  GITHUB_API_URL specifies a substitute for "https://api.github.com".
  GITHUB_SERVER_URL specifies a substitute for "https://github.com".
  GITHUB_REPOSITORY specifies a substitute for "Agoric/agoric-sdk".
  CONFIG_URL specifies a substitute for "https://main.agoric.net/network-config".

Past proposals for mainnet can be reviewed at https://ping.pub/agoric/gov
'
# usage [<exit code>]
usage() {
  printf '%s' "$USAGE"
  exit "${1:-64}" # EX_USAGE from BSD sysexits
}
# fail <error message> [<exit code>]
fail() {
  printf '%s\n\n' "$1"
  usage "${2:-}"
} 1>&2
# q <string>
q() {
  if [ -z "$1" ] || printf '%s' "$1" | grep -q '[^a-zA-Z0-9_,./:=-]'; then
    printf '%s' "$1" | sed "s/'/'\\\\''/g; 1s/^/'/; \$s/\$/'/"
  else
    printf '%s' "$1"
  fi
}

GH_API="${GITHUB_API_URL:-https://api.github.com}"
GH_URL="${GITHUB_SERVER_URL:-https://github.com}"
GH_REPO="${GITHUB_REPOSITORY:-Agoric/agoric-sdk}"
# gh_repo_curl /path/to/repo_resource
gh_repo_curl() {
  curl -sSLf \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "${GH_API}/repos/${GH_REPO}$1"
}
NET_CONFIG_URL="${CONFIG_URL:-https://main.agoric.net/network-config}"

# Consume script arguments (but not agd arguments).
MODE=any
SEND=
FORCE_UPGRADE_NAME=
TARGET_REF=
ARG_COUNT=0
while [ $# -ge 1 ]; do
  o="$1"
  case "$1" in
    --)
      shift
      break
      ;;
    -h* | --help) usage ;;
    -m* | --mode=* | --mode)
      # consume the argument, then push back a value from -x... or --xxx=...
      shift
      if [ -n "${o##--*}" ]; then
        [ ${#o} -ge 3 ] && set -- "${o#-?}" "$@"
      elif [ "${o#--*=}" != "$o" ]; then
        set -- "${o#--*=}" "$@"
      fi
      # consume the value
      [ $# -ge 1 ] || fail "$o requires a value"
      case "$1" in
        local | remote | any) MODE="$1" ;;
        *) fail 'mode must be "local", "remote", or "any"' ;;
      esac
      shift
      ;;
    -s* | --send)
      # consume the argument, then push back any following [short] options
      SEND=1
      shift
      if [ -n "${o##--*}" ]; then
        [ ${#o} -ge 3 ] && set -- "-${o#-?}" "$@"
      fi
      ;;
    -u* | --upgrade-name=* | --upgrade-name)
      # consume the argument, then push back a value from -x... or --xxx=...
      shift
      if [ -n "${o##--*}" ]; then
        [ ${#o} -ge 3 ] && set -- "${o#-?}" "$@"
      elif [ "${o#--*=}" != "$o" ]; then
        set -- "${o#--*=}" "$@"
      fi
      [ $# -ge 1 ] || fail "$o requires a value"
      FORCE_UPGRADE_NAME="$1"
      shift
      ;;
    -*) break ;;
    *)
      case "$ARG_COUNT" in
        0) TARGET_REF="$1" ;;
        *) fail 'Too many arguments' ;;
      esac
      ARG_COUNT=$((ARG_COUNT + 1))
      shift
      ;;
  esac
done

# Determine target commit and (if possible) release name and known upgrade names.
COMMIT_ID=
RELEASE_NAME=
UPGRADE_NAMES=()
if [[ -z "$COMMIT_ID" && "$MODE" != local && -n "$TARGET_REF" ]]; then
  echo "Checking $GH_API/repos/$GH_REPO for $TARGET_REF..." 1>&2
  tag_name=
  if [ "$TARGET_REF" = latest ]; then
    path="/releases/latest"
  else
    path="/releases/tags/$TARGET_REF"
  fi
  release_json="$(gh_repo_curl "$path" || true)"
  if [ -n "$release_json" ]; then
    eval "$(printf '%s\n' "$release_json" | jq -r --arg q "'" --arg qsub "'\\''" '
      [
        ["tag_name", .tag_name],
        ["RELEASE_NAME", .name],
        (.body
          | match("cosmos.*?name.*?: ([^\r\n]+)"; "gi")
          | .captures[0].string
          | ["UPGRADE_NAMES[${#UPGRADE_NAMES[@]}]", .]
        )
      ]
      | map("\(.[0])=\(.[1] | ($q + gsub($q; $qsub) + $q))")
      | join("\n")
    ')"
  fi
  commit_json="$(gh_repo_curl "/commits/${tag_name:-$TARGET_REF}" || true)"
  if [ -n "$commit_json" ]; then
    COMMIT_ID="$(printf '%s\n' "$commit_json" | jq -r .sha)"
  fi
fi
if [[ -z "$COMMIT_ID" && "$MODE" != remote ]]; then
  echo "Checking $(pwd) for ${TARGET_REF:-HEAD}..." 1>&2
  COMMIT_ID="$(git rev-parse "${TARGET_REF:-HEAD}")"
fi
if [ -z "$COMMIT_ID" ]; then
  echo "Could not identify a target commit" 1>&2
  usage 1 | sed '/^$/q' 1>&2
fi

# Verify and digest the zipball.
ZIP_URL="$GH_URL/$GH_REPO/archive/${COMMIT_ID}.zip"
echo "Verifying archive at $ZIP_URL..." 1>&2
curl -fLI --no-progress-meter "$ZIP_URL" -o- > /dev/null
echo "Generating SHA-256 checksum..." 1>&2
CHECKSUM=sha256:$(curl -fL "$ZIP_URL" -o- | shasum -a 256 | cut -d' ' -f1)
printf '\n' 1>&2

# Generate upgrade-info compatible with Agoric Cosmovisor.
# https://github.com/agoric-labs/cosmos-sdk/tree/Agoric/cosmovisor#readme
BINARY_URL="$ZIP_URL//agoric-sdk-${COMMIT_ID}?checksum=$CHECKSUM"
SOURCE_URL="$ZIP_URL?checksum=$CHECKSUM"
UPGRADE_INFO="{\"binaries\":{\"any\":\"$BINARY_URL\"},\"source\":\"$SOURCE_URL\"}"

# Determine the Cosmos upgrade name, prompting to resolve ambiguity (if possible).
UPGRADE_NAME_COUNT=${#UPGRADE_NAMES[@]}
LAST_UPGRADE_NAME=
[ "$UPGRADE_NAME_COUNT" -gt 0 ] && LAST_UPGRADE_NAME="${UPGRADE_NAMES[$UPGRADE_NAME_COUNT - 1]}"
UPGRADE_NAME=
if [ "$UPGRADE_NAME_COUNT" -gt 0 ]; then
  echo 'Found upgrade names:' 1>&2
  for name in "${UPGRADE_NAMES[@]}"; do
    printf '* %s\n' "$name" 1>&2
  done
  UPGRADE_NAME="$LAST_UPGRADE_NAME"
fi
if [ -n "$FORCE_UPGRADE_NAME" ]; then
  UPGRADE_NAME="$FORCE_UPGRADE_NAME"
elif [[ -t 0 && -t 1 && -t 2 && "$UPGRADE_NAME_COUNT" -ne 1 ]]; then
  hint="$(printf '%s' "$UPGRADE_NAME" | sed 's/\(..*\)/ (\1)/')"
  found=0
  printf '\n' 1>&2
  while [ $found -eq 0 ]; do
    printf 'upgrade name%s: ' "$hint" 1>&2
    read -r UPGRADE_NAME
    [ -n "$UPGRADE_NAME" ] || UPGRADE_NAME="$LAST_UPGRADE_NAME"
    if [ -n "$UPGRADE_NAME" ]; then
      found=$((UPGRADE_NAME_COUNT == 0))
      for name in "${UPGRADE_NAMES[@]}"; do
        [[ -n "$name" && "$UPGRADE_NAME" = "$name" ]] && found=1
      done
    fi
    if [ "$found" -eq 0 ]; then
      printf 'use unknown upgrade name %s (y/n)? ' "$(q "$UPGRADE_NAME")"
      read -r ok
      case "$(printf '%s' "$ok" | tr '[:upper:]' '[:lower:]')" in
        y | yes) found=1 ;;
      esac
    fi
  done
elif [ -n "$UPGRADE_NAME" ]; then
  printf 'Automatically selected %s.\n' "$(q "$UPGRADE_NAME")" 1>&2
else
  echo "Could not identify an upgrade name" 1>&2
  usage 1 | sed '/^$/q' 1>&2
fi

# Determine defaults for title and description.
DEFAULT_TITLE='<TITLE>'
DEFAULT_DESC='<DESCRIPTION>'
if [ -n "$RELEASE_NAME" ]; then
  DEFAULT_TITLE="Upgrade to $RELEASE_NAME"
  DEFAULT_DESC="$GH_URL/$GH_REPO/releases/tag/$RELEASE_NAME"
fi

# Determine which agd options are no-value flags.
flags="$(agd tx gov submit-proposal software-upgrade --help 2>&1 | awk '{
  if (!sub(/^[[:space:]]*-/, "-")) next;
  gsub(/,|  +.*/, " ");
  if (!match($0, / [^ -]/)) printf " %s ", $0;
}' || true)"
flags="${flags:-' --aux --dry-run --generate-only -h --help --ledger --no-validate --offline -y --yes --trace '}"

# Determine which agd options have been provided.
opts=' '
skip=
for arg in "$@"; do
  [[ -n "$skip" || "${arg#-}" = "$arg" ]] && skip= && continue
  opts="$opts ${arg%%=*} "                          # exclude trailing `=...`
  skip="${arg##*=*}"                                # skip next arg as an option value if $arg has no `=`
  [ "${flags/ ${arg%%=*} /}" != "$flags" ] && skip= # ...and is not a flag
done

# Initialize the agd command with mandatory arguments.
get_chain_id="curl -sSL $NET_CONFIG_URL | jq -r .chainName"
get_height="agoric-estimator -date '<DATE>' -rpc https://main.rpc.agoric.net:443 | tee /dev/stderr | sed -n '\$s/.* //p'"
CMD="agd tx gov submit-proposal software-upgrade $(q "$UPGRADE_NAME") \\
  --upgrade-info $(q "$UPGRADE_INFO") \\
  $([ -z "${opts##* --title *}" ] || printf '%s %s' --title "$(q "$DEFAULT_TITLE")") \\
  $([ -z "${opts##* --description *}" ] || printf '%s %s' --description "$(q "$DEFAULT_DESC")") \\
  $([ -z "${opts##* --chain-id *}" ] || printf '%s "%s(%s)"' --chain-id '$' "$get_chain_id") \\
  $([ -z "${opts##* --from *}" ] || echo "--from '<WALLET>'") \\
  $([ -z "${opts##* --upgrade-height *}" ] || printf '%s "%s(%s)"' --upgrade-height '$' "$get_height") \\
"
CMD="$(echo "$CMD" | grep -v '^   [\\]$\|^$' | sed '$s/ [\\]$//')"

# Incorporate remaining arguments.
skip=
for arg in "$@"; do
  CMD="$CMD$(printf " $([ -n "$skip" ] || printf '%s' '\\\n  ')%s" "$(q "$arg")")"
  [[ -n "$skip" || "${arg#-}" = "$arg" ]] && skip= && continue
  skip="${arg##*=*}"                                # next arg is an option value if $arg has no `=`
  [ "${flags/ ${arg%%=*} /}" != "$flags" ] && skip= # ...and is not a flag
done

# Print and optionally invoke the agd command.
printf '\n'
if [ -z "$SEND" ]; then
  printf '%s\n\n' "$CMD"
else
  printf '%s\n\n' "$CMD" 1>&2
  echo "Executing..." 1>&2
  eval "$CMD"
  printf '\n'
fi
