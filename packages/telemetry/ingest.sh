#! /bin/bash
set -ueo
thisdir=$(dirname -- "${BASH_SOURCE[0]}")

INGEST_START=${INGEST_START-""}
PROGRESS="$1.ingest-progress"

if [[ ! -s "$PROGRESS" ]]; then
  if [[ -z "$INGEST_START" ]]; then
    read -e -r -p 'Target start time [default=actual from slog] (%Y-%m-%dT%H:%M:%SZ): ' INGEST_START
  fi
  if [[ -n "$INGEST_START" ]]; then
    case "$1" in
    *.Z | *.gz) firstline=$(zcat "$1" | head -1) ;;
    *) firstline=$(head -1 "$1") ;;
    esac
    echo "$firstline" | jq --arg targetStart "$INGEST_START" \
      '{virtualTimeOffset: (($targetStart | fromdate) - .time), lastSlogTime: 0}' \
      > "$PROGRESS"
  fi
fi

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export SLOGSENDER=@agoric/telemetry/src/otel-trace.js
export OTEL_RESOURCE_ATTRIBUTES=ingest.file="$1"
time exec "$thisdir/bin/ingest-slog" "$1"
