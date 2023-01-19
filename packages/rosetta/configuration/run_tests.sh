#!/bin/sh

set -e

wait_for_rosetta() {
  timeout 90 sh -c 'until nc -z $0 $1; do sleep 1; done' rosetta 8080
}

echo "waiting for rosetta instance to be up"
wait_for_rosetta

echo "checking data API"
rosetta-cli check:data --configuration-file ./configuration/rosetta.json

echo "checking construction API"
rosetta-cli check:construction --configuration-file ./configuration/rosetta.json

