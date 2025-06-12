#!/bin/bash

source /usr/src/upgrade-test-scripts/env_setup.sh

set -e

killAgd
agd snapshots export
SNAPSHOT_DETAILS=$(agd snapshots list | head -n1 | sed -E 's/height: ([0-9]+) format: ([0-9]+) chunks: [0-9]+/\1 \2/')
echo found snapshot $SNAPSHOT_DETAILS
rm -rf /root/.agoric/data/application.db /root/.agoric/data/agoric
agd snapshots restore $SNAPSHOT_DETAILS

startAgd
