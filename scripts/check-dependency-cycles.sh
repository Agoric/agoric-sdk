#!/bin/bash
# Errors if number of cycle edges detected is too great
set -ueo pipefail

MAX_EDGES=${1-0}

graphout=$(scripts/graph.sh)
if test -z "$graphout"; then
  CYCLIC_EDGE_COUNT=0
else
  echo "$graphout"
  CYCLIC_EDGE_COUNT=$(echo "$graphout" | wc -l)
fi

echo CYCLIC_EDGE_COUNT "$CYCLIC_EDGE_COUNT"

if [[ $CYCLIC_EDGE_COUNT -gt $MAX_EDGES ]]; then
  echo Greater than MAX_EDGES "$MAX_EDGES"
  exit 1
fi

echo Less than or equal to MAX_EDGES "$MAX_EDGES"
