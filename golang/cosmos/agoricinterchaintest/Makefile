
all: TestPacketForwardMiddleware TestConformance

build:
	go test -c -o ./bin/agoricinterchaintest

TestPacketForwardMiddleware:
	PFME2E_CHAINNAME0=agoric PFME2E_CHAINNAME1=gaia PFME2E_CHAINNAME2=gaia PFME2E_CHAINNAME3=gaia go test -timeout 20m -v -run ^TestPacketForwardMiddleware

TestConformance:
	go test -timeout 20m -v -run ^TestConformance

TestChainPair:
	go test -timeout 20m -v -run ^TestChainPair