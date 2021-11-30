#! /bin/bash
set -e

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

export NETWORK_NAME=${NETWORK_NAME-localtest}

mkdir -p "$NETWORK_NAME/setup"
cd "$NETWORK_NAME/setup"

# Speed up the docker deployment by pre-mounting /usr/src/agoric-sdk.
DOCKER_VOLUMES="$(cd "$thisdir/../../.." > /dev/null && pwd -P):/usr/src/agoric-sdk" \
  "$thisdir/docker-deployment.sh" > deployment.json
exec "$thisdir/setup.sh" --force-init bootstrap ${1+"$@"}
