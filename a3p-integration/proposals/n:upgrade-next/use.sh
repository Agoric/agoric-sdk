#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

# Econ Committee accept invitations for Committee and Charter
./acceptInvites.js

# "oracles" accept their invitations and provide prices to priceFeeds
./setPrice.js 'ATOM' 12.01
./setPrice.js 'stATOM' 12.01

./openVault.js
