#! /bin/sh
NETWORK_NAME=${NETWORK_NAME-localtest}
SETUP_HOME=${SETUP_HOME-$NETWORK_NAME}
IMAGE=ghcr.io/agoric/cosmic-swingset-setup:${TAG-latest}
TTY=-i
test -t 0 && test -t 1 && TTY=-it
FLAGS=--entrypoint=/bin/bash
case "$1" in
  --pull)
    shift
    docker pull "$IMAGE"
    ;;
esac
case "$1" in
  shell) shift ;;
  *)
    set /usr/src/agoric-sdk/packages/deployment/scripts/integration-test.sh ${1+"$@"}
    ;;
esac

setup_volume=
if test -f "$PWD/$SETUP_HOME/setup/deployment.json"; then
  setup_volume=--volume="$PWD/$SETUP_HOME/setup:/data/chains/$SETUP_HOME"
elif test -f deployment.json; then
  setup_volume=--volume="$PWD:/data/chains/$SETUP_HOME"
fi
if test -n "$LOADGEN"; then
  setup_volume="$setup_volume --volume=$LOADGEN:/usr/src/testnet-load-generator"
fi
exec docker run --rm $TTY $FLAGS \
  --volume=ag-setup-cosmos-chains:/data/chains \
  --volume=ag-chain-cosmos-state:/root/.ag-chain-cosmos \
  --volume=/var/run/docker.sock:/var/run/docker.sock \
  $setup_volume \
  --env AGD_HOME=/root/.ag-chain-cosmos \
  --env NETWORK_NAME=$NETWORK_NAME \
  -w /data/chains \
  "$IMAGE" ${1+"$@"}
