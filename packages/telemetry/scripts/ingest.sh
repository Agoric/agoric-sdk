#! /bin/bash
# Send a `.slog` or `.slog.gz` to the OpenTelemetry Collector.
# Run with INGEST_START='' to start ingesting using slogfile timestamps.

set -ue
thisdir=$(dirname -- "${BASH_SOURCE[0]}")

# These three lines enable Agoric SDK's OpenTelemetry tracing.
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export SLOGSENDER=@agoric/telemetry/src/otel-trace.js
export OTEL_RESOURCE_ATTRIBUTES=ingest.file="$1"

PROGRESS="$1.ingest-progress"

if [[ ! -s "$PROGRESS" ]]; then
  if [[ "${INGEST_START+set}" != set ]]; then
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

time exec "$thisdir/../bin/ingest-slog" "$1"
