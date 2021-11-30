#! /bin/bash
# Run the deployment test on Github Actions:
# https://github.com/Agoric/agoric-sdk/actions/workflows/deployment-test.yml

set -ueo pipefail

GITREF=${1-master}

test -n "$GITHUB_TOKEN" || {
    echo "GITHUB_TOKEN must be set"
    exit 1
}

curl -XPOST "-HAuthorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/Agoric/agoric-sdk/actions/workflows/deployment-test.yml/dispatches \
  -d "$(jq -n --arg ref "$GITREF" '{$ref}')"
