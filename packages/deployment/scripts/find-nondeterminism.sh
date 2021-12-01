#! /bin/bash

set -ueo pipefail

real0=$(readlink "${BASH_SOURCE[0]}" || echo "${BASH_SOURCE[0]}")
thisdir=$(cd "$(dirname -- "$real0")" > /dev/null && pwd -P)

# unzip deployment-test-results.zip

for v in 0 1; do
  grep -E '"write"' validator$v-kvstore.trace > v$v.write
  grep -E '"metadata":null|blockHeight":1,' v$v.write > v$v.write-block1
  "$thisdir/crunch.mjs" validator$v-kvstore.trace > v$v.crunch
  sort v$v.crunch > v$v.sorted
done

diff v0.sorted v1.sorted
