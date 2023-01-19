# rosetta

This directory contains the files required to run the rosetta CI. It uses `agd` from the latest cosmic-swingset-solo

## docker-compose.yaml

Builds:

* scenario2 network via cosmic-swingset-solo with an INITIAL_HEIGHT of 1
* faucet is required so we can test construction API
* rosetta is the rosetta node used by rosetta-cli to interact with the cosmos-sdk app
* test_rosetta runs the rosetta-cli test against construction API and data API

## configuration

Contains the required files to set up rosetta cli and make it work against its workflows

## Rosetta-ci

Contains the files for a deterministic network, with fixed keys and some actions on there, to test parsing of msgs and historical balances.  This image is used to run an agd node and to run the rosetta server and the rosetta-cli.
Whenever [rosetta-cli](https://github.com/coinbase/rosetta-cli) releases a new version, rosetta-ci/Dockerfile should be updated to reflect the new version.

Build the container with:

```
./scripts/build-rosetta-ci.sh
```

Run the tests with:

```
docker-compose up --abort-on-container-exit --exit-code-from test
```