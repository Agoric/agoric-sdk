#!/bin/sh
set -xueo pipefail

SDK_REAL_DIR="$(cd "$(dirname "$(readlink -f -- "$0")")/.." > /dev/null && pwd -P)"

# For some reason something in the integration script
# relies on the SDK being at that location
# Set AGORIC_SDK_PATH to the SDK path on the host if this
# script is running inside a docker environment (and make sure to 
# bind mount /var/run/docker.sock)
if [ "$SDK_REAL_DIR" != "/usr/src/agoric-sdk" ]; then
  echo 'Agoric SDK must be mounted in "/usr/src/agoric-sdk"'
  exit 1
fi

export NETWORK_NAME=chaintest

sudo ln -sf /usr/src/agoric-sdk/packages/deployment/bin/ag-setup-cosmos /usr/local/bin/ag-setup-cosmos
rm -rf /usr/src/agoric-sdk/chaintest  ~/.ag-chain-cosmos/ /usr/src/testnet-load-generator/_agstate/agoric-servers/testnet-8000

cd /usr/src/agoric-sdk/
sudo ./packages/deployment/scripts/install-deps.sh
yarn install && yarn build && make -C packages/cosmic-swingset/
# change to "false" to skip extraction on success like in CI
testfailure="unknown"
/usr/src/agoric-sdk/packages/deployment/scripts/integration-test.sh || {
  echo "Test failed!!!"
  testfailure="true"
}

packages/deployment/scripts/setup.sh play stop || true
packages/deployment/scripts/capture-integration-results.sh $testfailure
echo yes | packages/deployment/scripts/setup.sh destroy || true

# Not part of CI
/usr/src/agoric-sdk/scripts/process-integration-results.sh $NETWORK_NAME/results
