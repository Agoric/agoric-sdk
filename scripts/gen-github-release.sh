#! /bin/bash
set -ueo pipefail
declare -r USAGE="Usage: $0 <tag>

Generate initial contents for a GitHub release of the specified tag.
"
usage() {
  [ -n "$1" ] && printf '%s\n' "$1"
  printf '%s' "$USAGE"
  exit 64
}
case "${1-}" in
  --help) usage ;;
  -*) usage 1>&2 "Error: unknown option \"$1\"" ;;
  '') usage 1>&2 "Error: missing tag name" ;;
esac

cd "$(dirname $0)"/..
declare -r tag="$1"
declare commit="$(git rev-parse "$tag")"
if [ -z "$commit" ]; then
  echo 1>&2 "Tag not found: $tag"
  commit="\$COMMIT"
fi

# Read version data from git tags or go.mod lines.
declare -r AWK_SUFFIX='{
  if (match($0, "^" prefix)) {
    print substr($0, RLENGTH + 1, length($0) - RLENGTH);
  }
}'
declare -r git_tags="$(git tag -l --contains "$tag")"
version-from-git-tag() {
  v="$(printf '%s' "$git_tags" | awk -v prefix="${1}@" "$AWK_SUFFIX" | tail -n1)"
  printf '%s\n' "${v:-$2}"
}
declare -r go_mod="$(git show -p "$tag":golang/cosmos/go.mod | sed 's#[[:space:]]*//.*##')"
version-from-go-mod() {
  v="$(printf '%s' "$go_mod" | awk -v prefix=".*/$1(/[^ ]*| ) *" "$AWK_SUFFIX" | tail -n1)"
  # Strip any pre-release and/or build components.
  v="${v%%-*}"
  v="${v%%+*}"
  printf '%s\n' "${v:-$2}"
}

# Replace `$`-prefixed placeholders using provided "$NAME=$VALUE" arguments,
# leaving alone placeholders with no substitution data.
declare -r AWK_REPLACE_PLACEHOLDERS='
  BEGIN {
    for (i = 1; i < ARGC; i++) {
      arg = ARGV[i];
      if (!match(arg, /^[^/=]+=/)) continue;
      placeholder = "$" substr(arg, 1, RLENGTH - 1);
      placeholders[placeholder] = 1;
      subs[placeholder] = substr(arg, RLENGTH + 1, length(arg) - RLENGTH);
      ARGV[i] = "";
    }
  }
  {
    rem = $0;
    output = "";
    while (match(rem, /[$][a-zA-Z0-9_]+/)) {
      replacement = placeholder = substr(rem, RSTART, RLENGTH);
      if (placeholders[placeholder]) replacement = subs[placeholder];
      output = output substr(rem, 1, RSTART - 1) replacement;
      rem = substr(rem, RSTART + RLENGTH, length(rem) - RLENGTH);
    }
    print output rem;
  }
'
set -- \
  TAG="$tag" \
  COMMIT="$commit" \
  AGORIC_COSMOS_VERSION="$(version-from-git-tag '@agoric/cosmos' '$AGORIC_COSMOS_VERSION')" \
  DOCKER_IMAGE_TAG="$(
    # See ../MAINTAINERS.md for derivation of Docker image tag from git tag @agoric/sdk@...
    version-from-git-tag '@agoric/sdk' '$DOCKER_IMAGE_TAG'
  )" \
  IBC_GO_VERSION="$(version-from-go-mod ibc-go '$IBC_GO_VERSION')" \
  COSMOS_SDK_VERSION="$(version-from-go-mod cosmos-sdk '$COSMOS_SDK_VERSION')" \
  COMETBFT_VERSION="$(version-from-go-mod cometbft '$COMETBFT_VERSION')"
cat << 'EOF' | awk "$AWK_REPLACE_PLACEHOLDERS" "$@"
The Agoric OpCo engineering team is pleased to publish the **`$TAG`** release. This release is primarily intended to $REASON.

The following new features are included in this release:

- #$ISSUE: $DESCRIPTION

The release contains at least the following fixes:

- #$ISSUE: $DESCRIPTION

The full set of changes in this release can be found at https://github.com/Agoric/agoric-sdk/pull/$RELEASE_PR.

This code has satisfied all pre-release/testnet validation checks, and is now recommended for nodes to upgrade from the previous `$PREV_RELEASE` release. As a chain-halting upgrade, once approved, all chain validators will need to upgrade from `$PREV_RELEASE` to this new version (after the chain halts due to reaching the height required in a governance proposal).

Since the `agoric-upgrade-11` release, state-sync snapshots include more data than before. Nodes which have inadvertently pruned this data (e.g. those created from a state-sync before the `agoric-upgrade-11` release) will not be able to produce such snapshots, and will need to be restored from state-sync. We are aware of continued performance issues related to state-sync. In particular, we've observed that on some deployments, the current implementation can require 100 GB of temporary free disk space and 16GB of memory.

Below is the _cosmos upgrade handler name_ for this release. This is the name that can be used in governance proposals to deploy this upgrade.

```
Cosmos Upgrade Handler Name: $COSMOS_UPGRADE_NAME
```

Below is the git information related to this software release. Note the _git tag_ does not always match the _cosmos upgrade handler name_.

```
Git Tag: $TAG
Git Commit: $COMMIT
@agoric/cosmos package version: $AGORIC_COSMOS_VERSION
Docker: ghcr.io/agoric/agoric-sdk:$DOCKER_IMAGE_TAG
```

As shown in go.mod this release is based on:

```
ibc-go $IBC_GO_VERSION
cosmos-sdk $COSMOS_SDK_VERSION
cometbft $COMETBFT_VERSION
```

## How to upgrade

Presuming that your node is running `$PREV_RELEASE`, once the upgrade height for a subsequent proposal to upgrade to `$TAG` has been reached, your node will halt automatically allowing you to upgrade the agoric stack.

```
# prepare by installing Go 1.20.2 or higher, Node 16 or 18, clang 10 or gcc 10
# stop the agd service
cd agoric-sdk
git fetch --all
git checkout $TAG
git clean -xdf
yarn install
yarn build
(cd packages/cosmic-swingset && make)
#start the agd service
```

Do _not_ copy the `agd` script or Go binary to another location. If you would like to have an executable `agd` in another location, then create a symlink in that location pointing to `agoric-sdk/bin/agd`.

### Node Version

Node.js 16.13 or higher (previous LTS) or Node.js 18.12 or higher (maintenance LTS).
Please note the current active LTS of Node 20 is not yet officially supported.

### Golang Version

The `$TAG` release requires Go 1.20.2 or higher.

### C Compiler Version

Clang version 10 or GCC version 10 required.

### Troubleshooting `repoconfig.sh: No such file or directory`

Unlike typical cosmos-sdk chains where the daemon is a single executable file, Agoric's use of cosmos-sdk depends on many components of `agoric-sdk` at runtime. Copying `agd` to `/usr/local/bin` or the like is unlikely to produce a working installation. For more detail, see: https://github.com/Agoric/agoric-sdk/issues/7825

### Troubleshooting `Cannot find dependency ...` in systemd

If you have `LimitNOFILE=4096` in your systemd unit file, change it to `LimitNOFILE=65536`. For more detail, see https://github.com/Agoric/agoric-sdk/issues/7817

## Specifying `--upgrade-info` for the software upgrade proposal

The `./scripts/gen-upgrade-proposal.sh` is designed to aid in composing a `agd tx submit-proposal software-upgrade ...` command. In particular, it captures package checksums to verify integrity of downloaded software.
EOF
