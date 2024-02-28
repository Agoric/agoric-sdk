#!/bin/bash

# Place here any test that should be executed using the executed proposal.
# The effects of this step are not persisted in further proposal layers.

yarn ava post.test.js
GLOBIGNORE=post.test.js
yarn ava *.test.js


set -e
source /usr/src/upgrade-test-scripts/env_setup.sh

# TODO trade game asset

# Check that gov1's bid from upgrade-10 use is still live
ADDR=$(agd keys show --address gov1 --keyring-backend=test)
agd query vstorage data published.wallet.$ADDR.current --output=json | jq -r ".value|fromjson.values[0]|fromjson.body" | tr "#" " " | jq .liveOffers >liveOffers.json
echo Live offers:
jq <liveOffers.json
grep "bid-" liveOffers.json
# bid-<timestamp> from upgrade-10
test_val $(jq '.|length' <liveOffers.json) 1 "gov1 live offers"

BID_ID=`grep "bid-" liveOffers.json | sed -e 's/.*\(bid-[01-9]*\)",/\1/'`
echo $BID_ID

test_val $BID_ID "bid-1707775723723" "bid ID"

agops inter bid cancel --from $GOV1ADDR --keyring-backend test  $BID_ID

agops inter bid by-price --price 1 --give 1.0IST --from $GOV1ADDR --keyring-backend test --offer-id bid-ephemerel


agops inter bid cancel --from $GOV1ADDR --keyring-backend test bid-ephemerel
