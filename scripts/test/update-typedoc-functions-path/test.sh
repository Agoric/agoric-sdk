#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
node --test update-typedoc-functions-path.test.js
