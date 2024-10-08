#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

node ./addGov4
./acceptInvites.js
