#!/bin/bash

# Set verbose execution
set -x

# Navigate to the specified directory
cd "$1" || exit $?

# Get the value of IGNORE_ENDO_BRANCH
ignore_dirty_yarn_lock=$2 || exit $?

# Check for unexpected changes
# Fail if git status detects changes
changes=$(git status --porcelain)

if [ "$ignore_dirty_yarn_lock" = true ]; then
  # Remove yarn.lock from the changes list
  # This exclusion is necessary because when a PR is merged into the master branch,
  # the 'yarn.lock' file is changed when Endo integration test CI workflow is executed.
  # For more details, refer to https://github.com/Agoric/agoric-sdk/issues/9850.
  changes=$(echo "$changes" | grep -v " yarn.lock")
fi

if [ -n "$changes" ]; then
  git status
  echo "Unexpected dirty git status in Agoric SDK path"
  exit 1
fi
