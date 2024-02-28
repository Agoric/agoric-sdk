# It is possible to use environment variables to change how the tests run
# - `E2ETEST_CHAINNAME0` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the first chain
# - `E2ETEST_CHAINNAME1` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the second chain
# - `E2ETEST_CHAINNAME2` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the third chain
# - `E2ETEST_CHAINNAME3` - set to `"agoric"`, `"gaia"`, or another chain known by interchaintest to choose which chain runs as the fourth chain
# - `E2ETEST_CHAINIMAGE_AGORIC` - the value of this will be used specific the repository & version of docker image to use for the agoric chain. a valid value must have a semicolon and be formatted as `repository:tag`. ex: `E2ETEST_CHAINIMAGE_AGORIC="ghcr.io/agoric/agoricinterchain:latest"`
# - `E2ETEST_RELAYERNAME` - set to `"cosmos"` or `"hermes"` to choose the relayer type
# - `E2ETEST_BLOCKS_TO_WAIT` - set to a number to control how many blocks to wait for an ACK from an IBC transfer and how many blocks to wait for TX settlement.
all: TestConformance TestPFM

# build - Sanity compile the tests
build:
	go test -c -o ./bin/agoricinterchaintest

# TestPFM - use 4 chains to test PFM
TestPFM:
	# Add a 20min timeout since tests are slow
	# Add failfast since each test depends on the next
	go test -failfast -timeout 20m -v -run ^TestPFM

# TestConformance - use 2 chains to test basic IBC conformance
TestConformance:
	# Add a 20min timeout since tests are slow
	go test -timeout 20m -v -run ^TestConformance

# TestChainPair - Minimal version of TestConformance does less permutations
TestChainPair:
	# Add a 20min timeout since tests are slow
	go test -timeout 20m -v -run ^TestChainPair
