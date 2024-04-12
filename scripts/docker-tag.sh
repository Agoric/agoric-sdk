#! /bin/bash
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
  SRC="ghcr.io/$DOCKERUSER/$img:$SRCTAG"
  DST="ghcr.io/$DOCKERUSER/$img:$DSTTAG"
  if manifest=$(docker manifest inspect "$SRC"); then
    AMENDS=$(jq -r .manifests[].digest <<< "$manifest" | sed -e "s!^!--amend $DOCKERUSER/$img@!")
    docker manifest create "$DST" $AMENDS
    docker manifest push "$DST"
  elif docker pull "$SRC"; then
    docker tag "$SRC" "$DST"
    docker push "$DST"
  else
    echo 1>&2 "Failed to find image $img:$SRCTAG"
  fi
done
