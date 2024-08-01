#!/bin/bash
# Set verbose execution
set -x
# Navigate to the specified directory
cd "$1" || exit $?
# Check for unexpected changes
# Fail if git status detects changes
changes=$(git status --porcelain)
if [ -n "$changes" ]; then
  git status
  echo "Unexpected dirty git status in Agoric SDK path"
  exit 1
fi
