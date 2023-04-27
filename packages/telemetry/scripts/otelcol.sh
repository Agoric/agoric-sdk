#! /bin/bash
# Have a look at ../sample-otel-collector.yaml for tips on configuration.
set -ueo pipefail
thisdir=$(dirname -- "${BASH_SOURCE[0]}")

# Make ./data to contain the otel-collector.yaml and any data file outputs.
mkdir -p data
OTELCOL_CONFIG="data/otel-collector.yaml"
test -f "$OTELCOL_CONFIG" || cp "$thisdir/../sample-otel-collector.yaml" "$OTELCOL_CONFIG"

# Run a Docker container to collect telemetry data.
docker run -p4318:4318 --rm -i -v"$PWD"/data:/data \
  otel/opentelemetry-collector-contrib --config="/$OTELCOL_CONFIG"
#watch ls -l data
