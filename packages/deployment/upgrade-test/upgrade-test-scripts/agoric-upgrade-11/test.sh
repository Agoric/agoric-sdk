#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

echo Wait for actions to settle
waitForBlock 2

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

# verify swing-store export-data is consistent and perform genesis style "upgrade"
killAgd
EXPORT_DIR=$(mktemp -t -d swing-store-export-upgrade-11-XXX)
make_swing_store_snapshot $EXPORT_DIR --artifact-mode none || fail "Couldn't make swing-store snapshot"
test_val "$(compare_swing_store_export_data $EXPORT_DIR)" "match" "swing-store consistent cosmos kvstore"

TMP_GENESIS_DIR=$EXPORT_DIR/genesis-export
cp $HOME/.agoric/config/genesis.json $TMP_GENESIS_DIR/old_genesis.json
cp $HOME/.agoric/data/priv_validator_state.json $TMP_GENESIS_DIR/priv_validator_state.json
rm -rf $HOME/.agoric/data
mkdir $HOME/.agoric/data
mv $TMP_GENESIS_DIR/priv_validator_state.json $HOME/.agoric/data
mv $TMP_GENESIS_DIR/* $HOME/.agoric/config/
startAgd
rm -rf $EXPORT_DIR

# zoe vat is at incarnation 1
echo "FIXME: bypassed zoe-full-upgrade validation"; return 0
test_val "$(yarn --silent node $upgrade11/vat-status.mjs zoe)" "1" "zoe vat incarnation"
