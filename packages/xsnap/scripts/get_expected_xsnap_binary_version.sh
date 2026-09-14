#! /bin/bash
set -ueo pipefail

# shellcheck source=/dev/null
source "$(dirname -- "${BASH_SOURCE[0]}")/../build.env"

echo "$XSNAP_BINARY_VERSION"
