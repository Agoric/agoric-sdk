#!/bin/bash
set -o xtrace
SCRIPT_DIR=$(cd ${0%/*} && pwd -P)

# Convert TAP to JUnit for each package
for pkg in ./packages/*/_testoutput.txt; do
  # skip if unable to expand if there are no test files
  if [[ $pkg != "./packages/*/_testoutput.txt" ]]; then
    echo "processing $pkg"
    junit=$(dirname "$pkg")/junit.xml
    echo "dest $junit"
    $SCRIPT_DIR/../ava-etap-to-junit.mjs $pkg > $junit || true
  fi
done

# Generate coverage reports
for cov in ./packages/**/coverage; do
  # skip if unable to expand if there are no test files
  if [[ $cov != "./packages/**/coverage" ]]; then
    echo "processing $pkg"
    (cd "$cov/../" && yarn run -T c8 report --reporter=lcov && find coverage -name "*.json" -delete)
  fi
done

# if root coverage exists, ignore it
if [[ -d "coverage" ]]; then
  rm -rf coverage
fi
