#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

GCE_INSTANCE="$1"
GCE_ZONE="$2"
IMAGE="$3"
IMAGE_NAME_ATTRIBUTE="ymax-container-image"
VOID="/dev/null"

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> "$VOID" && pwd)"

STARTUP_SCRIPT="$DIRECTORY_PATH/startup-script.sh"

echo "Deploying to $GCE_INSTANCE: $IMAGE"

gcloud compute instances remove-metadata "$GCE_INSTANCE" \
  --keys "gce-container-declaration" \
  --zone "$GCE_ZONE" || true

gcloud compute instances add-metadata "$GCE_INSTANCE" \
  --metadata "$IMAGE_NAME_ATTRIBUTE=$IMAGE" \
  --metadata-from-file "startup-script=$STARTUP_SCRIPT" \
  --zone "$GCE_ZONE"

echo "Restarting $GCE_INSTANCE to apply the new container image..."

gcloud compute instances stop "$GCE_INSTANCE" \
  --zone "$GCE_ZONE"
gcloud compute instances start "$GCE_INSTANCE" \
  --zone "$GCE_ZONE"
