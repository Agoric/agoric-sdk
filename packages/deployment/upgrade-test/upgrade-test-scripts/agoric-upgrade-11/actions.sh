#!/bin/bash

# Dockerfile in upgrade-test sets:
# WORKDIR /usr/src/agoric-sdk/
# Overriding it during development has occasionally been useful.
SDK=${SDK:-/usr/src/agoric-sdk}
. $SDK/upgrade-test-scripts/env_setup.sh

# Enable debugging
set -x

# hacky restore of pruned artifacts
killAgd
EXPORT_DIR=$(mktemp -t -d swing-store-export-upgrade-11-XXX)
WITHOUT_GENESIS_EXPORT=1 make_swing_store_snapshot $EXPORT_DIR --artifact-mode debug || fail "Couldn't make swing-store snapshot"
HISTORICAL_ARTIFACTS="$(cd $HOME/.agoric/data/agoric/swing-store-historical-artifacts/; for i in *; do echo -n "[\"$i\",\"$i\"],"; done)"
mv -n $HOME/.agoric/data/agoric/swing-store-historical-artifacts/* $EXPORT_DIR || fail "some historical artifacts not pruned"
mv $EXPORT_DIR/export-manifest.json $EXPORT_DIR/export-manifest-original.json
cat $EXPORT_DIR/export-manifest-original.json | jq -r ".artifacts = .artifacts + [${HISTORICAL_ARTIFACTS%%,}] | del(.artifactMode)" > $EXPORT_DIR/export-manifest.json
restore_swing_store_snapshot $EXPORT_DIR || fail "Couldn't restore swing-store snapshot"
startAgd
rm -rf $EXPORT_DIR

test_not_val "$(agops vaults list --from $GOV1ADDR)" "" "gov1 has no vaults"

# open up a vault
OFFER=$(mktemp -t agops.XXX)
agops vaults open --wantMinted 7.00 --giveCollateral 11.0 >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

# put some IST in
OFFER=$(mktemp -t agops.XXX)
agops vaults adjust --vaultId vault3 --giveMinted 1.5 --from $GOV1ADDR --keyring-backend=test >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

# add some collateral
OFFER=$(mktemp -t agops.XXX)
agops vaults adjust --vaultId vault3 --giveCollateral 2.0 --from $GOV1ADDR --keyring-backend="test" >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

# close out
OFFER=$(mktemp -t agops.XXX)
agops vaults close --vaultId vault3 --giveMinted 5.75 --from $GOV1ADDR --keyring-backend="test" >|"$OFFER"
agops perf satisfaction --from "$GOV1ADDR" --executeOffer "$OFFER" --keyring-backend=test

test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault3 -o jsonlines | jq -r '.vaultState') "closed" "vault3 is closed"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault3 -o jsonlines | jq -r '.locked.value') "0" "vault3 contains no collateral"
test_val $(agoric follow -l -F :published.vaultFactory.managers.manager0.vaults.vault3 -o jsonlines | jq -r '.debtSnapshot.debt.value') "0" "vault3 has no debt"
