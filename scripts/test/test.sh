#!/bin/bash
FILE="$(realpath "$BASH_SOURCE")"
cd "$(dirname "$FILE")"

# Execute each test.sh in a subdirectory
# and exit successfully if and only if they all succeed.
fail=0
for test in $(find * -mindepth 1 -maxdepth 1 -name test.sh); do
  "$test" && echo "OK $test" || {
    echo "FAIL $test"
    fail=1
  }
done
exit $fail
