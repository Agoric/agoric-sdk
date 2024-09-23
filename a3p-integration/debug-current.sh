#!/bin/sh

# Convenience script to debug the current proposal being worked on.

scripts/build-submission.sh proposals/z:acceptance testing/start-valueVow.js start-valueVow
scripts/build-submission.sh proposals/z:acceptance testing/restart-valueVow.js restart-valueVow

yarn test -m acceptance --debug
