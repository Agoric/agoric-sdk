#!/bin/sh

# TODO consolidate back into one job https://github.com/Agoric/agoric-sdk/pull/8061

# argument used by CI to split this across two jobs
SCOPE=$1

# taking roughly half the time to eslint all packages
PRIMARY_PACKAGES="@agoric/{cosmos,ertp,governance,inter-protocol,swing-store,swingset-vat,vats,wallet,zoe}"

case $SCOPE in
  primary)
    yarn lerna run --scope=$PRIMARY_PACKAGES --no-bail lint
    ;;
  rest)
    yarn lerna run --ignore=$PRIMARY_PACKAGES --no-bail lint
    ;;
  *)
    echo "The regular lint command now lints with types. Just use that."
    exit 0
    ;;
esac
