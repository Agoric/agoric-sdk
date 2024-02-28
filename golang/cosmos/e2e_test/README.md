# e2e_test

This independent golang project contains tests that validate IBC conformance and PFM functionality using a fork of Strangelove's `interchaintest`.
- upstream: https://github.com/strangelove-ventures/interchaintest
- fork: https://github.com/Agoric-labs/interchaintest

This project has its own `go.mod` since `interchaintest` pulls in version of cosmos-sdk, cometBFT, & ibc-go that differ from those `agd` would use.

## To Build

In order to sanity check that the tests build use:
```
$ make build
```

Note this is not build or run by CI since:
- It takes up to 40 minutes run the tests.
- These tests validate proper functionality of the cosmos IBC module and apps. This functionality does not regularly change.
- These tests require a docker image that is currently difficult to produce.
- Changes to files outside this directory should not be able to cause this directory to fail to compile. This tool lives in its own bubble.

## To Run Tests

To run all the tests:
```
$ make
```

To test IBC Conformance only:
```
$ make TestConformance
```

To test PFM functionality only:
```
$ make TestPFM
```

## Customizing Test Runs

It is possible to use environment variables to change how the tests run

- `E2ETEST_CHAINNAME0` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the first chain
- `E2ETEST_CHAINNAME1` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the second chain
- `E2ETEST_CHAINNAME2` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the third chain
- `E2ETEST_CHAINNAME3` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the fourth chain
- `E2ETEST_CHAINIMAGE_AGORIC` - the value of this will be used specific the repository & version of docker image to use for the agoric chain. a valid value must have a semicolon and be formatted as `repository:tag`. ex: `E2ETEST_CHAINIMAGE_AGORIC="ghcr.io/agoric/agoricinterchain:latest"`
- `E2ETEST_RELAYERNAME` - set to `"cosmos"` or `"hermes"` to choose the relayer type
- `E2ETEST_BLOCKS_TO_WAIT` - set to a number to control how many blocks to wait for an ACK from an IBC transfer and how many blocks to wait for TX settlement.

ex:
```
# run PFM tests with the:
# - first chains as agoric
# - the second chain as osmosis
# - the third chain as stride
# - the fourth chain as gaia
# - use the hermes relayer
# - note `-timeout 20m` which is included because these tests can be very slow 
$ E2ETEST_CHAINNAME0=agoric E2ETEST_CHAINNAME1=osmosis E2ETEST_CHAINNAME2=stride E2ETEST_CHAINNAME3=gaia E2ETEST_RELAYERNAME=hermes go test -timeout 20m -v -run ^TestPacketForwardMiddleware
```

## Debugging Flakes

`error in transaction (code: 6): failed to execute message; message index: 0: 809C699215C5BC041D4035479D28C30EAB11DBC5953E45D4545346B78482D82C: denomination trace not found`
- Flakey `interchaintest` has failed to properly run commands on relayers

`Wrong user balance on chain<blah> expected[<foo>>] actual[<bar>]`
- If you see `error in transaction (code: 6): failed to execute message; message index: 0: 809C699215C5BC041D4035479D28C30EAB11DBC5953E45D4545346B78482D82C: denomination trace not found` immediately below this error then the relayer fell over.
- If not, it's possible the test simply didn't wait enough blocks for the transactions to settle

If the tests terminate abnormally they may leave Docker containers or volumes stranded. These are safe to delete.

## Details on the Custom Fork of `interchaintest`

The [Agoric custom fork of interchaintest](https://github.com/Agoric-labs/interchaintest) is necessary because the agoric chain does not include the `x/crisis` module. However, `interchaintest` passes `agd` unsupported command line arguments to configure `x/crisis`. The fork contains a patch to skip these command line arguments when `interchaintest.ChainSpec.ChainConfig.NoCrisisModule` is set.

The exact git tag version of Agoric custom fork of interchaintest must be specified in the `go.mod` for this test suite. It is important to update that tag in the fork and in `go.mod` whenever the fork has a new update.

## Building a Compatible Docker Image

`interchaintest` relies on a partner tool [`heighliner`](https://github.com/strangelove-ventures/heighliner). `heighliner` modified Docker images to make them compatible with `interchaintest`. To build an Agoric compatible docker image:

Get the Agoric compatible changes (one time):
```
$ git clone git@github.com:strangelove-ventures/heighliner.git
$ cd heighliner
$ git remote add toliaqat git@github.com:toliaqat/heighliner.git
$ git pull toliaqat
$ git merge remotes/toliaqat/main
```

For each new image:
- edit `dockerfile/agoric/Dockerfile` in the heighliner checkout to point to the proper base image. Likely you'll want to use an a3p-integration image.
- then:
```
$ go build
$ ./heighliner build -c agoric -g main -t agoric:heighliner-agoric
```
- then run agoricinterchaintests with `E2ETEST_CHAINIMAGE_AGORIC=agoric:heighliner-agoric`