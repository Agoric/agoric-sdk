#!/bin/bash
set -euo pipefail

source /usr/src/upgrade-test-scripts/env_setup.sh

sdk_root="${AGORIC_SDK:-/usr/src/agoric-sdk}"
deploy_dir="$sdk_root/packages/portfolio-deploy"

cd "$deploy_dir"
yarn build
yarn build:bundle
yarn build:bundle-id

# Install the candidate without starting or replacing a contract. The test
# upgrades the existing ymax1 instance through its wallet-held ymaxControl.
# shellcheck disable=SC2086
agd tx swingset install-bundle @dist/bundle-ymax0.json \
  $SIGN_BROADCAST_OPTS --from validator
