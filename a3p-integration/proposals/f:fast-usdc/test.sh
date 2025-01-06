#!/bin/bash
set -euo pipefail

yarn ava

./test-cli.sh
