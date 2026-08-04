#! /bin/bash
# Smoke-test the ts-node-pack publish path against a local Verdaccio
# registry. Skips the dapp-offer-up "getting started" integration test
# that scripts/registry.sh's `ci` mode would run afterward (currently
# broken on master and unrelated to packing).
#
# Usage: scripts/packing/smoketest-publishing.sh

set -ueo pipefail

thisdir=$(cd -- "$(dirname "$0")" > /dev/null && pwd)
ROOT=$(cd "$thisdir/../.." && pwd)

cd "$ROOT"

# `bg-publish` runs runRegistry + publish + a final dirty check, then
# leaves Verdaccio running so a developer can poke at the published
# packages. It does NOT run the dapp integration test.
exec "$ROOT/scripts/registry.sh" bg-publish smoketest
