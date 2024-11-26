#!/bin/bash

# FIXME these commands are run against the `@agoric/fast-usdc` pulled from NPM
# but should be run against the local SDK. The `yarn link` command described in
# a3p-integration/README.md is supposed to make that work but it's not working.

yarn @agoric/fast-usdc operator accept >| accept.json
cat accept.json
yarn agoric wallet send --offer accept.json --from gov1 --keyring-backend="test"
ACCEPT_OFFER_ID=$(agoric wallet extract-id --offer accept.json)

# FIXME attest something
yarn @agoric/fast-usdc operator attest --previousOfferId "$ACCEPT_OFFER_ID" >| attest.json
cat attest.json
yarn agoric wallet send --offer attest.json --from gov1 --keyring-backend="test"
