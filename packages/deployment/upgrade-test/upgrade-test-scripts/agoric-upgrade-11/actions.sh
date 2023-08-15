#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# Enable debugging
set -x

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

# hacky restore of pruned artifacts
killAgd
EXPORT_DIR=$(mktemp -t -d swing-store-export-upgrade-11-XXX)
make_swing_store_snapshot $EXPORT_DIR --artifact-mode debug || fail "Couldn't make swing-store snapshot"
test_val "$(compare_swing_store_export_data $EXPORT_DIR)" "match" "swing-store export data"
HISTORICAL_ARTIFACTS="$(cd $HOME/.agoric/data/agoric/swing-store-historical-artifacts/; for i in *; do echo -n "[\"$i\",\"$i\"],"; done)"
mv -n $HOME/.agoric/data/agoric/swing-store-historical-artifacts/* $EXPORT_DIR || fail "some historical artifacts not pruned"
mv $EXPORT_DIR/export-manifest.json $EXPORT_DIR/export-manifest-original.json
cat $EXPORT_DIR/export-manifest-original.json | jq -r ".artifacts = .artifacts + [${HISTORICAL_ARTIFACTS%%,}] | del(.artifactMode)" > $EXPORT_DIR/export-manifest.json
restore_swing_store_snapshot $EXPORT_DIR || fail "Couldn't restore swing-store snapshot"
rmdir $HOME/.agoric/data/agoric/swing-store-historical-artifacts
rm -rf $EXPORT_DIR
startAgd
