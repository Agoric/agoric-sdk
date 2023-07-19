#!/bin/sh
set -xueo pipefail

SDK_SRC="$(cd "$(dirname "$(readlink -f -- "$0")")/.." > /dev/null && pwd -P)"
export SDK_SRC

# Set AGORIC_SDK_PATH to the SDK path on the host if this
# script is running inside a docker environment (and make sure to 
# bind mount /var/run/docker.sock)
export AGORIC_SDK_PATH="${AGORIC_SDK_PATH-$SDK_SRC}"

export NETWORK_NAME=chaintest

sudo ln -sf "$SDK_SRC/packages/deployment/bin/ag-setup-cosmos" /usr/local/bin/ag-setup-cosmos
rm -rf "$SDK_SRC/chaintest"  ~/.ag-chain-cosmos/ /usr/src/testnet-load-generator/_agstate/agoric-servers/testnet-8000

cd "$SDK_SRC"
sudo ./packages/deployment/scripts/install-deps.sh
yarn install && XSNAP_RANDOM_INIT=1 yarn build && make -C packages/cosmic-swingset/
# change to "false" to skip extraction on success like in CI
testfailure="unknown"
DOCKER_VOLUMES="$AGORIC_SDK_PATH:/usr/src/agoric-sdk" \
packages/deployment/scripts/integration-test.sh || {
  echo "Test failed!!!"
  testfailure="true"
}

packages/deployment/scripts/setup.sh play stop || true
packages/deployment/scripts/capture-integration-results.sh $testfailure
echo yes | packages/deployment/scripts/setup.sh destroy || true

# Not part of CI
scripts/process-integration-results.sh $NETWORK_NAME/results
