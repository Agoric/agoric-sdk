#!/bin/bash

if [ -z "$GOV1ADDR" ]; then
    echo run env_setup.sh to set GOV1ADDR
    exit 1
fi

micro=000000

# send some collateral to gov1
agd tx bank send validator $GOV1ADDR 20123$micro${ATOM_DENOM} \
     --keyring-backend=test --chain-id=agoriclocal --yes -bblock -o json

export PATH=/usr/src/agoric-sdk/packages/agoric-cli/bin:$PATH
agops vaults open --giveCollateral 5000 --wantMinted 20000 > /tmp/offer.json
agops perf satisfaction --executeOffer /tmp/offer.json --from gov1 --keyring-backend=test
