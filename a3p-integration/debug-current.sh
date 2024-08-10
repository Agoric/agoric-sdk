#!/bin/sh

# Convience script to debug the current proposal being worked on.

scripts/build-submission.sh proposals/b:enable-orchestration testing/start-valueVow.js start-valueVow
scripts/build-submission.sh proposals/b:enable-orchestration testing/restart-valueVow.js restart-valueVow

yarn test -m orch --debug
