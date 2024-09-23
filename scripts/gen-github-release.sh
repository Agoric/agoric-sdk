#! /bin/bash
set -ueo pipefail
declare -r USAGE="Usage: $0 {prerelease | latest} <tag>

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
  '') usage 1>&2 "Error: missing maturity" ;;
  prerelease | latest) declare -r maturity="$1" ;;
  *) usage 1>&2 "Error: unknown maturity \"$1\"" ;;
esac
case "${2-}" in
  --help) usage ;;
  -*) usage 1>&2 "Error: unknown option \"$2\"" ;;
  '') usage 1>&2 "Error: missing tag name" ;;
  *) declare -r tag="$2" ;;
esac
[ $# -eq 2 ] || usage 1>&2 "Error: extra argument(s)"

cd "$(dirname $0)"/..
commit="$(git rev-parse "$tag")"
if [ -z "$commit" ]; then
  echo 1>&2 "Tag not found: $tag"
  commit="\$COMMIT"
fi
declare -r commit

# Read version data from git tags or go.mod lines.
declare -r AWK_SUFFIX='{
  if (match($0, "^" prefix)) {
    print substr($0, RLENGTH + 1, length($0) - RLENGTH);
  }
}'
git_tags="$(git tag -l --contains "$tag")"
declare -r git_tags
version-from-git-tag() {
  printf '%s' "$git_tags" | awk -v prefix="${1}@" "$AWK_SUFFIX" | tail -n1
}
go_mod="$(git show -p "$tag":golang/cosmos/go.mod | sed 's#[[:space:]]*//.*##')"
declare -r go_mod
version-from-go-mod() {
  v="$(printf '%s' "$go_mod" | awk -v prefix=".*/$1(/[^ ]*| ) *" "$AWK_SUFFIX" | tail -n1)"
  # Strip any pre-release and/or build components.
  v="${v%%-*}"
  v="${v%%+*}"
  printf '%s\n' "$v"
}

# Replace `$`-prefixed placeholders using provided "$NAME=$VALUE" arguments,
# leaving alone placeholders with no substitution data.
declare -r AWK_REPLACE_PLACEHOLDERS='
  BEGIN {
    for (i = 1; i < ARGC; i++) {
      arg = ARGV[i];
      if (!match(arg, "^[^/=]+=")) continue;
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
case "$maturity" in
  prerelease)
    declare -r checks_template='Assuming this release satisfies all pre-release/testnet validation checks, it will be promoted to `$NEXT_RELEASE`, and recommended for chains to upgrade from the previous `$PREV_RELEASE` release'
    ;;
  latest)
    declare -r checks_template='This release has satisfied all pre-release/testnet validation checks, and is now recommended for chains to upgrade from the previous `$PREV_RELEASE` release'
    ;;
esac
agoric_cosmos_version="$(version-from-git-tag '@agoric/cosmos')"
ibc_go_version="$(version-from-go-mod ibc-go)"
cosmos_sdk_version="$(version-from-go-mod cosmos-sdk)"
cometbft_version="$(version-from-go-mod cometbft)"
# See ../MAINTAINERS.md for derivation of Docker image tag from git tag @agoric/sdk@...
docker_image_tag="$(version-from-git-tag '@agoric/sdk')"
set -- \
  CHECKS_TEXT="$(printf '%s' "$checks_template" | awk "$AWK_REPLACE_PLACEHOLDERS")" \
  TAG="$tag" \
  COMMIT="$commit" \
  AGORIC_COSMOS_VERSION="${agoric_cosmos_version:-\$AGORIC_COSMOS_VERSION}" \
  IBC_GO_VERSION="${ibc_go_version:-\$IBC_GO_VERSION}" \
  COSMOS_SDK_VERSION="${cosmos_sdk_version:-\$COSMOS_SDK_VERSION}" \
  COMETBFT_VERSION="${cometbft_version:-\$COMETBFT_VERSION}" \
  DOCKER_IMAGE_TAG="${docker_image_tag:-\$DOCKER_IMAGE_TAG}"
cat << 'EOF' | awk "$AWK_REPLACE_PLACEHOLDERS" "$@"
The Agoric OpCo engineering team is pleased to publish the **`$TAG`** release. This release is primarily intended to $REASON.

The following new features are included in this release:

- #$ISSUE: $DESCRIPTION

The release contains at least the following fixes:

- #$ISSUE: $DESCRIPTION

The full set of changes in this release can be found at https://github.com/Agoric/agoric-sdk/pull/$RELEASE_PR.

$CHECKS_TEXT. As a chain-halting upgrade, once approved, all chain validators will need to upgrade from `$PREV_RELEASE` to this new version (after the chain halts due to reaching the height required in a governance proposal).

## State-sync

State-sync snapshots now only include minimal data to restore a node. However there are still continued performance issues related to state-sync. In particular, we've observed that on some deployments, the snapshot taking and restoring process can take multiple hours, require about 20GB of temporary free disk space, and 16GB of memory.

## Cosmos Upgrade Handler Name

Below is the _cosmos upgrade handler name_ for this release. This is the name that can be used in governance proposals to deploy this upgrade.

```
Cosmos Upgrade Handler Name: $COSMOS_UPGRADE_NAME
```

## Tags

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

### Prerequisites

Install supported versions of Go, Node.js, and a compiler such as gcc or clang as documented in the [README](https://github.com/Agoric/agoric-sdk/tree/$TAG#prerequisites).

Make sure that the environment running the agd service has the same Node.js version as the environment used for building. In particular, if using `nvm` to manage Node.js version, the service environment should enable nvm and use the same version.

### Building

```
# (stop the agd service)
cd agoric-sdk
git fetch --all
git checkout $TAG
git clean -xdf && git submodule foreach --recursive git clean -xdf
./bin/agd build
# (start the agd service)
```

Do _not_ copy the `agd` script or Go binary to another location. If you would like to have an executable `agd` in another location, then create a symlink in that location pointing to `agoric-sdk/bin/agd`.

### Troubleshooting `module ... was compiled against a different Node.js version` and `SyntaxError` issues

The agd service is not using the same version of Node.js as the one used when building. The most likely cause is that `nvm` was used to manage the Node.js version in the shell when building. Either install the required version of Node.js globally using the system's package manager, or enable `nvm` in the environment of the agd service.

### Troubleshooting `repoconfig.sh: No such file or directory`

Unlike typical cosmos-sdk chains where the daemon is a single executable file, Agoric's use of cosmos-sdk depends on many components of `agoric-sdk` at runtime. Copying `agd` to `/usr/local/bin` or the like is unlikely to produce a working installation. For more detail, see: https://github.com/Agoric/agoric-sdk/issues/7825

### Troubleshooting `Cannot find dependency ...` in systemd

If you have `LimitNOFILE=4096` in your systemd unit file, change it to `LimitNOFILE=65536`. For more detail, see https://github.com/Agoric/agoric-sdk/issues/7817

## Specifying `--upgrade-info` for the software upgrade proposal

The `./scripts/gen-upgrade-proposal.sh` is designed to aid in composing a `agd tx submit-proposal software-upgrade ...` command. In particular, it captures package checksums to verify integrity of downloaded software.
EOF
