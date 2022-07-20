#!/bin/sh

# we don't collect type info by default because it can slow eslint by 8-10x
# FIXME even in CI it has become too slow so disable until https://github.com/Agoric/agoric-sdk/issues/5788
# export AGORIC_ESLINT_TYPES='keypresent'

# CI and some VMs OOM without this
export NODE_OPTIONS='--max-old-space-size=8192'

# argument used by CI to split this across two jobs
SCOPE=$1

# taking roughly half the time to eslint all packages
PRIMARY_PACKAGES="@agoric/{cosmos,ertp,governance,run-protocol,swing-store,swingset-vat,vats,wallet,zoe}"

case $SCOPE in
primary)
    yarn lerna run --scope=$PRIMARY_PACKAGES --no-bail lint
    ;;
rest)
    yarn lerna run --ignore=$PRIMARY_PACKAGES --no-bail lint
    ;;
*)
    # all scopes
    yarn lint
    ;;
esac
