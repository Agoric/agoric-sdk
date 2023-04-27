#! /bin/bash
# setup.sh - Run the local ag-setup-cosmos with arguments
set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

NETWORK_NAME=${NETWORK_NAME-localtest}
export NETWORK_NAME

export AG_SETUP_COSMOS_NAME=$NETWORK_NAME
export AG_SETUP_COSMOS_HOME=${AG_SETUP_COSMOS_HOME-"$PWD/$NETWORK_NAME/setup"}

# Put our bindir into the PATH so that children can find ag-setup-cosmos.
export PATH="$thisdir/../bin:${GOBIN-${GOPATH-/usr/local}/bin}:$PATH"

# Run our setup command.
exec ag-setup-cosmos ${1+"$@"}
