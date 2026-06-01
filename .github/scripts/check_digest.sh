#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

GCE_INSTANCE="$1"
GCE_ZONE="$2"
TARGET_IMAGE="$3"
OUTPUT_FILE="${4:-"$GITHUB_OUTPUT"}"
VOID="/dev/null"

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> "$VOID" && pwd)"

ENV_FILE="${5:-"$DIRECTORY_PATH/.env.gcp"}"

echo "Target image: $TARGET_IMAGE"

METADATA="$(
  gcloud compute instances describe "$GCE_INSTANCE" \
    --format "json" \
    --zone "$GCE_ZONE"
)"

CURRENT_ENV="$(
  printf '%s' "$METADATA" | \
  jq '.metadata.items[]? | select(.key=="ymax-container-env") | .value' --raw-output
)"
CURRENT_IMAGE="$(
  printf '%s' "$METADATA" | \
  jq '.metadata.items[]? | select(.key=="ymax-container-image") | .value' --raw-output
)"

TARGET_ENV=""
if test -f "$ENV_FILE"
then
  TARGET_ENV="$(cat "$ENV_FILE")"
fi

if test "$CURRENT_IMAGE" != "$TARGET_IMAGE"
then
  echo "Current image is $CURRENT_IMAGE, need to deploy with $TARGET_IMAGE"
  echo "should_deploy=true" >> "$OUTPUT_FILE"
elif test "$CURRENT_ENV" != "$TARGET_ENV"
then
  echo "Env on $GCE_INSTANCE differs from $ENV_FILE, need to deploy"
  echo "should_deploy=true" >> "$OUTPUT_FILE"
else
  echo "VM $GCE_INSTANCE already configured with image $CURRENT_IMAGE and matching env"
  echo "should_deploy=false" >> "$OUTPUT_FILE"
fi
