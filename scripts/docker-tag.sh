#! /bin/sh
# docker-tag.sh - Create a new tag for a set of Agoric Docker images
set -xe

SRCTAG=$1
DSTTAG=$2
DOCKERUSER=${3-agoric}

if [ -z "$DSTTAG" ]; then
  echo 1>&2 "Usage: $0 SRCTAG DSTTAG"
  exit 1
fi

for img in agoric-sdk cosmic-swingset-setup cosmic-swingset-solo deployment; do
  docker pull $DOCKERUSER/$img:$SRCTAG
  docker tag $DOCKERUSER/$img:$SRCTAG $DOCKERUSER/$img:$DSTTAG
  docker push $DOCKERUSER/$img:$DSTTAG
done
