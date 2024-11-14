#!/bin/bash
set -ueo pipefail

# Convenience script to debug the current proposal being worked on.

(
  cd 'proposals/z:acceptance'
  ../../scripts/build-submission.sh testing/start-valueVow.js start-valueVow
  ../../scripts/build-submission.sh testing/restart-valueVow.js restart-valueVow
)

yarn test -m acceptance --debug
