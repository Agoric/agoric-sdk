#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

# Enable debugging
set -x

# CWD is agoric-sdk
upgrade11=./upgrade-test-scripts/agoric-upgrade-11

yarn --silent bundle-source --cache-json /tmp packages/governance/src/contractGovernor.js contractGovernor-upgrade
yarn --silent bundle-source --cache-json /tmp packages/inter-protocol/src/psm/psm.js psm-upgrade
yarn --silent bundle-source --cache-json /tmp packages/inter-protocol/src/reserve/reserve.js reserve-upgrade
yarn --silent bundle-source --cache-json /tmp packages/inter-protocol/src/auction/auctioneer.js auctioneer-upgrade
yarn --silent bundle-source --cache-json /tmp packages/inter-protocol/src/vaultFactory/vaultFactory.js vaultFactory-upgrade

# fluxAggregator, smartWallet

# Start by upgrading the governance facet, which will do a null upgrad on the
#  contract, and then upgrade the contract itself.


GOV_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-contractGovernor-upgrade.json
echo bundle-contractGovernor-upgrade.json $GOV_HASH
PSM_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-psm-upgrade.json
echo bundle-psm-upgrade.json $PSM_HASH
RESERVE_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-reserve-upgrade.json
echo bundle-reserve-upgrade.json $RESERVE_HASH
AUCTIONEER_HASH=`jq -r .endoZipBase64Sha512 /tmp/bundle-auctioneer-upgrade.json
echo bundle-auctioneer-upgrade.json $AUCTIONEER_HASH
VAULTS_HASH=`jq -r .endozipbase64sha512 /tmp/bundle-vaultfactory-upgrade.json
echo bundle-vaultfactory-upgrade.json $vaults_hash
#    grep for hashes in upgrade scripts



echo +++++ install bundles +++++
for f in /tmp/bundle-[a-v]*-upgrade.json; do
  echo installing   $f
  agd tx swingset install-bundle "@$f" \
    --from gov1 --keyring-backend=test --gas=auto \
    --chain-id=agoriclocal -bblock --yes
done

