#!/bin/bash

set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

# give the core eval time to finish
waitForBlock 10
