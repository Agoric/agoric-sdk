#!/bin/bash

echo ++++DEBUG 11wf/actions.sh

# Dockerfile in upgrade-test sets:
# WORKDIR /usr/src/agoric-sdk/
# Overriding it during development has occasionally been useful.
SDK=${SDK:-/usr/src/agoric-sdk}
. $SDK/upgrade-test-scripts/env_setup.sh

echo ++++DEBUG 11wf/actions.sh: testing walletFactory upgrade...

AGUP=$SDK/upgrade-test-scripts/agoric-upgrade-11wf
cd $AGUP

## build proposal and install bundles
waitForBlock 2
../tools/mint-ist.sh
./wallet-all-ertp/wf-install-bundles.sh

echo ++++DEBUG 11wf/actions.sh: installed bundles. proposing upgrade

## upgrade wallet factory
./wallet-all-ertp/wf-propose.sh

echo ++++DEBUG 11wf/actions.sh: proposing game installation

## start game1
./wallet-all-ertp/wf-game-propose.sh

echo ++++DEBUG Pay 0.25IST join the game and get some places

# Pay 0.25IST join the game and get some places
node ./wallet-all-ertp/gen-game-offer.mjs Shire Mordor >/tmp/,join.json
agops perf satisfaction --from $GOV1ADDR --executeOffer /tmp/,join.json --keyring-backend=test

echo ++++DEBUG 11wf/actions.sh: done

cd $SDK
