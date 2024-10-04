#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

node ./addGov4
./acceptInvites.js

./verifyPushedPrice.js 'ATOM' 12.01
./verifyPushedPrice.js 'stATOM' 12.01
./submitBid.js
