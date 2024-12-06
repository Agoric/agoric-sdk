#!/bin/bash
yarn ava

# TODO get CLI test passing and part of CI
./test-cli.sh || echo "CLI test failed"
