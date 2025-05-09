#!/bin/sh
set -xueo pipefail

SDK_SRC="$(cd "$(dirname "$(readlink -f -- "$0")")/.." > /dev/null && pwd -P)"
export SDK_SRC

# Set AGORIC_SDK_PATH to the SDK path on the host if this
# script is running inside a docker environment (and make sure to
# bind mount /var/run/docker.sock)
export AGORIC_SDK_PATH="${AGORIC_SDK_PATH-$SDK_SRC}"

export NETWORK_NAME=chaintest

# Note: the deployment test and the loadgen test in testnet mode modify some
# directories in $HOME so provide an empty $HOME for them.
export HOME="$(mktemp -d -t deployment-integration-home.XXXXX)"

# While it'd be great if these [tests were more hermetic](https://github.com/Agoric/agoric-sdk/issues/8059),
# this manual runner must currently reset paths relative to the SDK to ensure
# reproducible tests.
rm -rf "$SDK_SRC/../testnet-load-generator/_agstate/agoric-servers/testnet-8000"

export OUTPUT_PATH="$SDK_SRC/../deployment-test-results/networks-$(date +%s)"
mkdir -p "$OUTPUT_PATH"

cd "$SDK_SRC"
sudo ./packages/deployment/scripts/install-deps.sh
yarn install && XSNAP_RANDOM_INIT=1 yarn build && make -C packages/cosmic-swingset/

cd "$OUTPUT_PATH"
# change to "false" to skip extraction on success like in CI
testfailure="unknown"
DOCKER_VOLUMES="$AGORIC_SDK_PATH:/usr/src/agoric-sdk" \
  LOADGEN=1 \
  $SDK_SRC/packages/deployment/scripts/integration-test.sh || {
  echo "Test failed!!!"
  testfailure="true"
}

$SDK_SRC/packages/deployment/scripts/setup.sh play stop || true
$SDK_SRC/packages/deployment/scripts/capture-integration-results.sh $testfailure
echo yes | $SDK_SRC/packages/deployment/scripts/setup.sh destroy || true

# Not part of CI
$SDK_SRC/scripts/process-integration-results.sh $NETWORK_NAME/results
