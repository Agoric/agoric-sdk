#!/bin/bash
# Run proposal tests, skipping any whose test image digest matches a previously
# passed run. This is a wrapper around `synthetic-chain test` that adds
# digest-based caching. Fails fast: a test failure aborts the remaining
# proposals (they are reported as "not reached").
#
# A proposal test image's identity (Docker digest) fully determines the test
# outcome. An image is invalidated by:
#   1. SDK image changes (the base image)
#   2. Proposal package changes
#   3. Changes to any preceding proposal (images chain sequentially)
#   4. Proposal sequencing changes (insert, remove, or reorder)
# If the digest matches a previously passed run, re-testing is redundant.
#
# Cache sharing depends on GitHub Actions cache scoping:
#   - Digests that pass on master are available to all branches (never re-tested)
#   - Digests that pass on a PR branch are available to that branch only
#   - Digests from unrelated PR branches are NOT shared
# This means a proposal may re-test across different PR branches until it
# passes on master. This is acceptable since master runs on every merge.
#
# Usage: test-with-cache.sh [DIGEST_CACHE_FILE]
#   DIGEST_CACHE_FILE: path to a file of previously passed digests (default: /tmp/proposal-test-passed-digests)
#
# TODO: upstream this into @agoric/synthetic-chain as a built-in caching mode.

set -uo pipefail

CACHE_FILE="${1:-/tmp/proposal-test-passed-digests}"
touch "$CACHE_FILE"

# Generate Dockerfile and bake config once, so we can build test images
# directly with `docker buildx bake` to check digests before running.
yarn synthetic-chain prepare-build

proposals=$(ls -d proposals/?:* | sed 's|proposals/[a-z]:||')
cached=0
tested=0
failed=0
not_reached=0

for proposal in $proposals; do
  img="ghcr.io/agoric/agoric-3-proposals:test-$proposal"

  # After a failure, skip remaining proposals without building.
  if [ "$failed" -gt 0 ]; then
    echo "::warning::Not reached: $proposal (skipped due to earlier failure)"
    not_reached=$((not_reached + 1))
    continue
  fi

  # Build the test image to obtain its digest. Uses cached layers
  # from build:synthetic-chain so this is fast (~seconds).
  docker buildx bake --load "test-$proposal"
  digest=$(docker inspect --format "{{.Id}}" "$img")

  if grep -qF "$digest" "$CACHE_FILE"; then
    echo "::notice::Cached: $proposal (image $digest already passed)"
    cached=$((cached + 1))
    docker rmi "$img" || true
    continue
  fi

  echo "Testing $proposal (image $digest)"
  if yarn synthetic-chain test --match "$proposal" --exact; then
    echo "$digest $proposal" >> "$CACHE_FILE"
    tested=$((tested + 1))
  else
    echo "::error::Failed: $proposal (image $digest)"
    failed=$((failed + 1))
  fi
done

total=$((cached + tested + failed + not_reached))
echo "::notice::Results: $tested tested, $cached cached, $failed failed, $not_reached not reached (out of $total)"

if [ "$failed" -gt 0 ]; then
  exit 1
fi
