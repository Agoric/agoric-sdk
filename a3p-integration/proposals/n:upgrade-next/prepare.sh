#!/bin/bash

set -euo pipefail

# Actions that should happen before a software upgrade proposal.
# Any effects are persisted for later stages (such as "use" or "test") and
# proposals.

[ -f initial.test.js ] && yarn ava initial.test.js
