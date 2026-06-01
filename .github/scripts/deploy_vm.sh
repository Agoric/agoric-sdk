#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

ENV_NAME_ATTRIBUTE="ymax-container-env"
GCE_INSTANCE="$1"
GCE_ZONE="$2"
IMAGE="$3"
IMAGE_NAME_ATTRIBUTE="ymax-container-image"
VOID="/dev/null"

DIRECTORY_PATH="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> "$VOID" && pwd)"

ENV_FILE="${4:-"$DIRECTORY_PATH/.env.gcp"}"
STARTUP_SCRIPT="$DIRECTORY_PATH/startup-script.sh"

echo "Deploying to $GCE_INSTANCE: $IMAGE"

gcloud compute instances remove-metadata "$GCE_INSTANCE" \
  --keys "gce-container-declaration" \
  --zone "$GCE_ZONE" || true

gcloud compute instances add-metadata "$GCE_INSTANCE" \
  --metadata "$IMAGE_NAME_ATTRIBUTE=$IMAGE" \
  --metadata-from-file "startup-script=$STARTUP_SCRIPT" \
  --zone "$GCE_ZONE"

if test -f "$ENV_FILE"
then
  gcloud compute instances add-metadata "$GCE_INSTANCE" \
    --metadata-from-file "$ENV_NAME_ATTRIBUTE=$ENV_FILE" \
    --zone "$GCE_ZONE"
else
  echo "Skipping adding non existent file $ENV_FILE in env"
fi

echo "Restarting $GCE_INSTANCE to apply the new container image..."

gcloud compute instances stop "$GCE_INSTANCE" \
  --zone "$GCE_ZONE"
gcloud compute instances start "$GCE_INSTANCE" \
  --zone "$GCE_ZONE"
