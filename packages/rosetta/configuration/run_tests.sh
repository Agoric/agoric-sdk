#!/bin/bash

set -e

wait_for_rosetta() {
  TIMEOUT=90
  I=0

  while [ $I -lt $TIMEOUT ]; do
	if nc -z rosetta 8080; then
		break
	else
		sleep 1
	fi
	I=$(( I++ ))
  done;
}

echo "waiting for rosetta instance to be up"
wait_for_rosetta

echo "checking data API"
rosetta-cli check:data --configuration-file ./configuration/rosetta.json

echo "checking construction API"
rosetta-cli check:construction --configuration-file ./configuration/rosetta.json

