#! /bin/bash
set -e

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

NETWORK_NAME=${NETWORK_NAME-localtest}
export NETWORK_NAME

export AG_SETUP_COSMOS_NAME=$NETWORK_NAME
export AG_SETUP_COSMOS_HOME="$PWD"

# Put our bindir into the PATH so that children can find ag-setup-cosmos.
export PATH="$thisdir/../bin:$PATH"

if test "$1" == --force-init; then
  shift
  # Set up the network.
  ag-setup-cosmos init --noninteractive
fi

# Run our setup command.
exec ag-setup-cosmos ${1+"$@"}
