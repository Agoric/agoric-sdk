
all: TestConformance TestPFM

build:
	go test -c -o ./bin/agoricinterchaintest

TestPFM:
	go test -timeout 20m -v -run ^TestPFM

TestConformance:
	go test -timeout 20m -v -run ^TestConformance

TestChainPair:
	go test -timeout 20m -v -run ^TestChainPair