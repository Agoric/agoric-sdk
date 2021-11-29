#! /bin/bash
set -e

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

NETWORK_NAME=${NETWORK_NAME-localtest}
export NETWORK_NAME

export AG_SETUP_COSMOS_NAME=$NETWORK_NAME
export AG_SETUP_COSMOS_HOME="$PWD"
ASC="$thisdir/../bin/ag-setup-cosmos"

if test "$1" == --force-init; then
  shift
  # Set up the network.
  $ASC init --noninteractive
fi

# Run our setup command.
exec $ASC ${1+"$@"}
