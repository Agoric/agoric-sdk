#!/usr/bin/env bash
set -euo pipefail

# Inputs
GCE_INSTANCE="${1:-}"
GCE_ZONE="${2:-}"
TARGET_IMAGE="${3:-}"
OUTPUT_FILE="${4:-$GITHUB_OUTPUT}"

if [[ -z "$GCE_INSTANCE" || -z "$GCE_ZONE" || -z "$TARGET_IMAGE" ]]; then
  echo "Usage: $0 <GCE_INSTANCE> <GCE_ZONE> <TARGET_IMAGE> [OUTPUT_FILE]" >&2
  exit 1
fi

echo "Target image: $TARGET_IMAGE"

# Get current container declaration from instance metadata
DECL=$(
  gcloud compute instances describe "$GCE_INSTANCE" \
    --zone "$GCE_ZONE" \
    --format=json \
  | jq -r '.metadata.items[]? | select(.key=="gce-container-declaration") | .value'
)

# Compare digest with deployed image
if [[ -n "$DECL" ]] && printf '%s\n' "$DECL" | grep -F "$TARGET_IMAGE" >/dev/null 2>&1; then
  echo "VM $GCE_INSTANCE already configured with this digest. Skipping deploy."
  echo "should_deploy=false" >> "$OUTPUT_FILE"
else
  echo "Digest differs (or not set) on $GCE_INSTANCE. Will deploy."
  echo "should_deploy=true" >> "$OUTPUT_FILE"
fi
