#! /bin/bash
# Run the integration tests on Github Actions:
# https://github.com/Agoric/agoric-sdk/actions/workflows/integration.yml

set -ueo pipefail

GITREF=${1-master}

test -n "$GITHUB_TOKEN" || {
  echo "GITHUB_TOKEN must be set"
  exit 1
}

curl -XPOST "-HAuthorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Agoric/agoric-sdk/actions/workflows/integration.yml/dispatches \
  -d "$(jq -n --arg ref "$GITREF" '{$ref}')"
