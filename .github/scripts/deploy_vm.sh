#!/usr/bin/env bash
set -euo pipefail

# Inputs
GCE_INSTANCE="${1:-}"
GCE_ZONE="${2:-}"
IMAGE="${3:-}"
ENV_FILE="${4:-./.env.gcp}"

if [[ -z "$GCE_INSTANCE" || -z "$GCE_ZONE" || -z "$IMAGE" ]]; then
  echo "Usage: $0 <GCE_INSTANCE> <GCE_ZONE> <IMAGE> [ENV_FILE]" >&2
  exit 1
fi

echo "Deploying to $GCE_INSTANCE: $IMAGE"

gcloud compute instances update-container "$GCE_INSTANCE" \
  --zone "$GCE_ZONE" \
  --container-env-file "$ENV_FILE" \
  --container-image "$IMAGE"
