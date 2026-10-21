#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

GCE_INSTANCE="$1"
GCE_ZONE="$2"
TARGET_IMAGE="$3"
OUTPUT_FILE="${4:-"$GITHUB_OUTPUT"}"

echo "Target image: $TARGET_IMAGE"

METADATA="$(
  gcloud compute instances describe "$GCE_INSTANCE" \
    --format "json" \
    --zone "$GCE_ZONE"
)"

CURRENT_IMAGE="$(
  printf '%s' "$METADATA" | \
  jq '.metadata.items[]? | select(.key=="ymax-container-image") | .value' --raw-output
)"

if test "$CURRENT_IMAGE" != "$TARGET_IMAGE"
then
  echo "Current image is $CURRENT_IMAGE, need to deploy with $TARGET_IMAGE"
  echo "should_deploy=true" >> "$OUTPUT_FILE"
else
  echo "VM $GCE_INSTANCE already configured with image $CURRENT_IMAGE and matching env"
  echo "should_deploy=false" >> "$OUTPUT_FILE"
fi
