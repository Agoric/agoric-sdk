#!/bin/bash

start=$((${EPOCHREALTIME/./} / 1000))
output=$(make docker-build-sdk 2>&1)
ec=$?
sleep 1
end=$((${EPOCHREALTIME/./} / 1000))
dur=$((end - start))

echo "TAP version 13"
echo "1..1"
if [[ $ec -ne 0 ]]; then
  fail=1
  echo "not ok 1 - Docker Build %ava-dur=${dur}ms"
  echo "$output"
else
  pass=1
  echo "ok 1 - Docker Build %ava-dur=${dur}ms"
fi
echo "# tests 1"
echo "# pass ${pass:-0}"
echo "# fail ${fail:-0}"
