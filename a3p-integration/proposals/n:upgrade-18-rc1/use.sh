#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

node ./addGov4

# Econ Committee accept invitations for Committee and Charter
./acceptInvites.js

# "oracles" accept their invitations and provide prices to priceFeeds
./verifyPushedPrice.js 'ATOM' 12.01
./verifyPushedPrice.js 'stATOM' 12.01
