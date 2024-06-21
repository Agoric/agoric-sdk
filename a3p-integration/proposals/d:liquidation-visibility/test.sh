#!/bin/bash

set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

yarn test:post-liq
yarn test:post
yarn test:scenario
