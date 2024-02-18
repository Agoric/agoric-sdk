golang/cosmos/e2e_test/Makefile
all: TestConformance TestPFM

build:
	go test -c -o ./bin/agoricinterchaintest

TestPFM:
	# Add a 20min timeout since tests are slow
	# Add failfast since each test depends on the next
	go test -failfast -timeout 20m -v -run ^TestPFM

TestConformance:
	# Add a 20min timeout since tests are slow
	go test -timeout 20m -v -run ^TestConformance

TestChainPair:
	# Add a 20min timeout since tests are slow
	go test -timeout 20m -v -run ^TestChainPair