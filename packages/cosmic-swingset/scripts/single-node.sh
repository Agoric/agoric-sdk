#!/bin/bash

set -e

DAEMON=${DAEMON-gaiad}
CLI=${CLI-gaiacli}
STAKE=${STAKE-10000000000stake}
coins="${STAKE},100000000000samoleans,1000000000ubld,100provisionpass"

CHAINID=$1
GENACCT=$2

if [ -z "$1" ]; then
  echo "Need to input chain id..."
  exit 1
fi

if [ -z "$2" ]; then
  echo "Need to input genesis account address..."
  exit 1
fi

# Build genesis file incl account for passed address
$DAEMON init --chain-id $CHAINID $CHAINID
$CLI keys add validator --keyring-backend="test"
$DAEMON add-genesis-account validator $STAKE --keyring-backend="test"
$DAEMON add-genesis-account $GENACCT $coins --keyring-backend="test"
$DAEMON gentx --name validator $STAKE --keyring-backend="test"
$DAEMON collect-gentxs

# Silly old Darwin
case $(sed --help 2>&1 | sed -n 2p) in
  "usage: sed script"*"[-i extension]"*)
    sedi() {
      sed -i '' ${1+"$@"}
    }
    ;;
  *)
    sedi() {
      sed -i ${1+"$@"}
    }
    ;;
esac

case $DAEMON in
  ag-chain-cosmos)
    # For Agoric
    DIR=$(dirname -- "${BASH_SOURCE[0]}")
    "$DIR/../../agoric-cli/bin/agoric" set-defaults --bootstrap-address=$GENACCT ag-chain-cosmos ~/.$DAEMON/config
    ;;
esac

# Set proper defaults and change ports
sedi 's/"leveldb"/"goleveldb"/g' ~/.$DAEMON/config/config.toml
sedi 's#"tcp://127.0.0.1:26657"#"tcp://0.0.0.0:26657"#g' ~/.$DAEMON/config/config.toml
sedi 's/timeout_commit = "5s"/timeout_commit = "1s"/g' ~/.$DAEMON/config/config.toml
sedi 's/timeout_propose = "3s"/timeout_propose = "1s"/g' ~/.$DAEMON/config/config.toml
sedi 's/index_all_keys = false/index_all_keys = true/g' ~/.$DAEMON/config/config.toml

# Start the chain
$DAEMON start
