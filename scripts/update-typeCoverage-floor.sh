#!/bin/bash
# For each package.json that has mentions typeCoverage,
# run the tool to update the value
SDK=$PWD

for package in packages/*/package.json; do
  if grep --quiet typeCoverage "$SDK/$package"; then
    dir=$(dirname "$package")
    echo "$dir"
    cd "$SDK/$dir" || exit 1
    # This can raise or lower the amount. "--update-if-higher" will only raise it,
    # but this gives us more flexibility. Reviewers should evaluate whether
    # lowering is warranted.
    yarn run --top-level --silent type-coverage --update
  else
    # This scripts only updates. If you want to set a flor, add a `typeCoverage` property in the package.
    echo "No typeCoverage found in $package"
  fi
done
