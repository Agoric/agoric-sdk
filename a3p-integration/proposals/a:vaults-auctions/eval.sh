#!/bin/bash

echo "[$PROPOSAL] Recording the auctioneer instance"
./saveAuctionInstance.js

echo "[$PROPOSAL] Running proposal declared in package.json"
# copy to run in the proposal package so the dependencies can be resolved
cp /usr/src/upgrade-test-scripts/eval_submission.js .
./eval_submission.js
