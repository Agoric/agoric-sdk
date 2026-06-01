#! /usr/bin/env bash

set -o errexit -o nounset -o pipefail

CONTAINER_NAME="ymax-planner"
DB_HOST_PATH="/var/lib/kv-store"
DB_MOUNT_PATH="/db_data"
ENV_ARG=()
ENV_NAME_ATTRIBUTE="ymax-container-env"
IMAGE_NAME_ATTRIBUTE="ymax-container-image"
METADATA_URL="http://metadata.google.internal/computeMetadata/v1/instance/attributes"
VOID="/dev/null"
WATCHDOG_PATH="/var/lib/google/container-watchdog.sh"
WATCHDOG_SERVICE_PATH="/etc/systemd/system/container-watchdog.service"
WATCHDOG_TIMER_SERVICE_NAME="container-watchdog.timer"
WATCHDOG_STALE="2m"

ENV_FILE="/run/${CONTAINER_NAME}.env"
WATCHDOG_TIMER_SERVICE_PATH="/etc/systemd/system/$WATCHDOG_TIMER_SERVICE_NAME"

get_metadata() {
  curl --fail --header "Metadata-Flavor: Google" --silent "${METADATA_URL}/$1" || true
}

log_error() {
    echo "$1" >&2
    exit 1
}

IMAGE="$(get_metadata "$IMAGE_NAME_ATTRIBUTE")"
get_metadata "$ENV_NAME_ATTRIBUTE" > "$ENV_FILE"

mkdir --parents "$(dirname "$WATCHDOG_PATH")"

cat > "$WATCHDOG_PATH" <<EOF
#! /usr/bin/env bash
set -o errexit -o nounset -o pipefail

CONTAINER="$CONTAINER_NAME"
STALE="$WATCHDOG_STALE"

log() {
  logger --tag "container-watchdog[\$CONTAINER]" "\$*"
}

test "\$(
  docker inspect --format '{{.State.Running}}' "\$CONTAINER" 2> $VOID
)" = "true" || exit 0

test -n "\$(
  docker logs --since "\$STALE" --tail 1 "\$CONTAINER" 2>&1
)" && exit 0

log "no logs in last \$STALE — restarting"
docker restart "\$CONTAINER" > $VOID && \
log "restarted" || \
{
  log "restart FAILED"
  exit 1
}
EOF
chmod +x "$WATCHDOG_PATH"

cat > "$WATCHDOG_SERVICE_PATH" <<EOF
[Service]
ExecStart=$WATCHDOG_PATH
Type=oneshot

[Unit]
After=docker.service
Description=Container log watchdog
EOF

cat > "$WATCHDOG_TIMER_SERVICE_PATH" <<EOF
[Install]
WantedBy=timers.target

[Timer]
OnBootSec=3min
OnUnitActiveSec=1min
Unit=container-watchdog.service

[Unit]
Description=Run container watchdog every minute
EOF

if test -z "$IMAGE"
then
  log_error "No $IMAGE_NAME_ATTRIBUTE metadata set, nothing to start"
else
  if test -s "$ENV_FILE"
  then
    ENV_ARG=(--env-file "$ENV_FILE")
  fi

  echo "Starting ${CONTAINER_NAME} with image ${IMAGE}"

  docker pull "$IMAGE"

  docker rm --force "$CONTAINER_NAME" > "$VOID" 2>&1 || true

  docker run \
    --detach \
    --name "$CONTAINER_NAME" \
    --network "host" \
    --restart "always" \
    --volume "${DB_HOST_PATH}:${DB_MOUNT_PATH}" \
    "${ENV_ARG[@]}" \
    "$IMAGE"

  systemctl daemon-reload
  systemctl enable --now "$WATCHDOG_TIMER_SERVICE_NAME"
fi
