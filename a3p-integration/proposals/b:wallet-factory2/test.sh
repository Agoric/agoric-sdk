#!/bin/bash

set -e

source /usr/src/upgrade-test-scripts/env_setup.sh

yarn ava post.test.js
