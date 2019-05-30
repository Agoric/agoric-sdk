REPOSITORY = agoric/cosmic-swingset
TAG := $(shell sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)

include Makefile.ledger
all: build install

docker-install:
	install -m 755 ./ag-chain-cosmos ./ag-cosmos-helper /usr/local/bin/

docker-build:
	docker build -t $(REPOSITORY):latest .
	docker tag $(REPOSITORY):latest $(REPOSITORY):$(TAG)

docker-push:
	docker push $(REPOSITORY):latest
	docker push $(REPOSITORY):$(TAG)

compile-go: go.sum
	GO111MODULE=on go build -v -buildmode=c-shared -o lib/libagcosmosdaemon.so lib/agcosmosdaemon.go
	-install_name_tool -id `pwd`/lib/libagcosmosdaemon.so lib/libagcosmosdaemon.so

build: compile-go compile-node

compile-node:
	test ! -d node_modules/bindings || npm run build

install: go.sum
	# Not needed, because we librarify ./cmd/ag-chain-cosmos as ./lib/libagcosmosdaemon.so
	#GO111MODULE=on go install -tags "$(build_tags)" ./cmd/ag-chain-cosmos
	GO111MODULE=on go install -v -tags "$(build_tags)" ./cmd/ag-cosmos-helper

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify

start-ag-solo:
	-rm -r t1
	bin/ag-solo init t1
	cd t1 && ../bin/ag-solo start

show-local-gci:
	@./calc-gci.js ~/.ag-cosmos-chain/config/genesis.json

set-local-gci-ingress:
	cd t1 && ../bin/ag-solo set-gci-ingress `../calc-gci.js ~/.ag-cosmos-chain/config/genesis.json` `../calc-rpcport.js ~/.ag-cosmos-chain/config/config.toml`

start-ag-solo-connected-to-local:
	-rm -r t1
	bin/ag-solo init t1
	$(MAKE) set-local-gci-ingress
	cd t1 && ../bin/ag-solo start
