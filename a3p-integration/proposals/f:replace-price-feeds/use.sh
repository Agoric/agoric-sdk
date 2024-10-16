#!/bin/bash

# Exit when any command fails
set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

./pushPrice.js 'ATOM' 12.01
./pushPrice.js 'stATOM' 12.01
