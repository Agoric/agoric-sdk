#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

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
yarn --silent bundle-source --cache-json /tmp packages/vats/test/bootstrapTests/zcfProbe.js prober-contract

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
