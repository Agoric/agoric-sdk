#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# Enable debugging
set -x

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

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

######################################################################
# FIXME: remove this line when these tests don't hardcode bundle hashes.
echo 1>&2 "FIXME: skipping zoe-full-upgrade tests"; return 0

# Pre-steps:
#  * fill Wallets
#  * build and install bundles
#  * create instance of prober contract and run expecting no atomicRearrange
#
# Action:
#  * upgrade Zoe and ZCF
#
# Finish
#  * create instance of prober contract and run expecting to see atomicRearrange

yarn --silent bundle-source --cache-json /tmp packages/zoe/src/contractFacet/vatRoot.js Zcf-upgrade
yarn --silent bundle-source --cache-json /tmp packages/vats/src/vat-zoe.js Zoe-upgrade
yarn --silent bundle-source --cache-json /tmp packages/boot/test/bootstrapTests/zcfProbe.js prober-contract

echo +++ checking Zoe/Zcf hashes +++
ZCF_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-Zcf-upgrade.json`
ZOE_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-Zoe-upgrade.json`
echo bundle-Zcf-upgrade.json $ZCF_HASH
grep $ZCF_HASH $upgrade11/zoe-full-upgrade/zcf-upgrade-script.js || exit 1
echo bundle-Zoe-upgrade.json $ZOE_HASH
grep $ZOE_HASH $upgrade11/zoe-full-upgrade/zcf-upgrade-script.js || exit 1

echo +++ prober hash +++
PROBER_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-prober-contract.json`
echo bundle-prober-contract.json $PROBER_HASH
grep $PROBER_HASH $upgrade11/zoe-full-upgrade/run-prober-script.js || exit 1

echo +++++ fill wallet +++++
agd tx bank send validator $GOV1ADDR  12340000000${ATOM_DENOM} --from validator --chain-id agoriclocal --keyring-backend test --yes
agops vaults open --wantMinted 10000 --giveCollateral 2000 > wantIST
agops perf satisfaction  --executeOffer wantIST  --from gov1 --keyring-backend test


echo +++++ install bundles +++++
for f in /tmp/bundle-{Z*-upgrade,prober-contract}.json; do
  echo installing   $f
  agd tx swingset install-bundle "@$f" \
    --from gov1 --keyring-backend=test --gas=auto \
    --chain-id=agoriclocal -bblock --yes
done


echo +++++ Run prober first time +++++
$upgrade11/zoe-full-upgrade/run-prober.sh
test_val "$(agd query vstorage data published.prober-asid9a -o jsonlines | jq -r '.value' | jq -r '.values[0]')" "false" "Prober calling zcf.atomicReallocate()"


# upgrade zoe to a version that can change which ZCF is installed; tell Zoe to
# use a new version of ZCF.  THIS MATCHES THE UPGRADE OF THE LIVE CHAIN
echo +++++ upgrade Zoe and ZCF +++++
$upgrade11/zoe-full-upgrade/zcf-upgrade-driver.sh


echo +++++ Run prober second time +++++
# Re-run prober test and expect internal atomicRearrange.
$upgrade11/zoe-full-upgrade/run-prober.sh
test_val "$(agd query vstorage data published.prober-asid9a -o jsonlines | jq -r '.value' | jq -r '.values[0]')" "true" "Prober called zcf.atomicReallocate()"
