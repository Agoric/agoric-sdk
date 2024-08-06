#!/bin/bash

# Set verbose execution
set -x

# Navigate to the specified directory
cd "$1" || exit $?

# Get the value of IGNORE_ENDO_BRANCH
ignore_endo_branch=$2 || exit $?

# Get the status of the repository
changes=$(git status --porcelain)

if [ "$ignore_endo_branch" = false ]; then
  # Remove yarn.lock from the changes list
  changes=$(echo "$changes" | grep -v " yarn.lock")
fi

if [ -n "$changes" ]; then
  git status
  echo "Unexpected dirty git status in Agoric SDK path"
  exit 1
fi

echo "Git status is clean or only yarn.lock is changed on master branch"
