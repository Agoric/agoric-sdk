REPOSITORY = agoric/cosmic-swingset
TAG := $(shell test ! -f package.json || sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)
CHAIN_ID = agoric
INITIAL_TOKENS = 1000agmedallion

include Makefile.ledger
all: build install

scenario0-setup:
	-rm -r ~/.ag-chain-cosmos
	-rm ag-cosmos-chain-state.json
	python3 -mvenv ve3
	ve3/bin/pip install setup-solo/

scenario0-run-client:
	ve3/bin/ag-setup-solo

scenario0-run-chain:
	@echo 'No local chain needs to run in scenario0'

scenario1-setup: scenario0-setup
scenario1-run-chain:
	@test "`uname -s`" = Linux || \
		{ echo 'Must run under Linux; use "make docker-build && docker/ag-setup-cosmos bootstrap"'; exit 1; }
	setup/ag-setup-cosmos bootstrap

scenario1-run-client: scenario0-run-client

AGC = ./lib/ag-chain-cosmos
scenario2-setup:
	-rm -r ~/.ag-chain-cosmos
	-rm ag-cosmos-chain-state.json
	$(AGC) init --chain-id=$(CHAIN_ID)
	rm -rf t1
	bin/ag-solo init t1
	$(AGC) add-genesis-account `cat t1/ag-cosmos-helper-address` $(INITIAL_TOKENS)
	$(MAKE) set-local-gci-ingress
	@echo "ROLE=two_chain BOOT_ADDRESS=\`cat t1/ag-cosmos-helper-address\` agc start"
	@echo "(cd t1 && ../bin/ag-solo start --role=two_client)"

scenario2-run-chain:
	ROLE=two_chain BOOT_ADDRESS=`cat t1/ag-cosmos-helper-address` $(AGC) start
scenario2-run-client:
	cd t1 && ../bin/ag-solo start --role=two_client

scenario3-setup:
	rm -rf t1
	bin/ag-solo init t1
scenario3-run-client:
	cd t1 && ../bin/ag-solo start --role=three_client
scenario3-run-chain:
	@echo 'No local chain needs to run in scenario3'

docker-pull:
	for f in '' -pserver -setup -setup-solo -solo; do \
		docker pull $(REPOSITORY)$$f:latest || exit $$?; \
	done

docker-install: docker-pull
	install -m 755 docker/* /usr/local/bin/

docker-build: docker-build-base docker-build-solo docker-build-pserver docker-build-setup docker-build-setup-solo

docker-build-setup:
	docker build -t $(REPOSITORY)-setup:latest ./setup

docker-build-base:
	hash=`git rev-parse --short HEAD`; \
	  dirty=`git diff --quiet || echo -dirty`; \
	  echo "$$hash$$dirty" > lib/git-revision.txt
	docker build -t $(REPOSITORY):latest .

docker-build-pserver:
	docker build -t $(REPOSITORY)-pserver:latest ./provisioning-server

docker-build-solo:
	docker build -t $(REPOSITORY)-solo:latest ./lib/ag-solo

docker-build-setup-solo:
	docker build -t $(REPOSITORY)-setup-solo:latest ./setup-solo

docker-push: docker-push-base docker-push-solo docker-push-setup docker-push-pserver docker-push-setup-solo

docker-push-setup:
	docker tag $(REPOSITORY)-setup:latest $(REPOSITORY)-setup:$(TAG)
	docker push $(REPOSITORY)-setup:latest
	docker push $(REPOSITORY)-setup:$(TAG)

docker-push-base:
	docker tag $(REPOSITORY):latest $(REPOSITORY):$(TAG)
	docker push $(REPOSITORY):latest
	docker push $(REPOSITORY):$(TAG)

docker-push-pserver:
	docker tag $(REPOSITORY)-pserver:latest $(REPOSITORY)-pserver:$(TAG)
	docker push $(REPOSITORY)-pserver:latest
	docker push $(REPOSITORY)-pserver:$(TAG)

docker-push-solo:
	docker tag $(REPOSITORY)-solo:latest $(REPOSITORY)-solo:$(TAG)
	docker push $(REPOSITORY)-solo:latest
	docker push $(REPOSITORY)-solo:$(TAG)

docker-push-setup-solo:
	docker tag $(REPOSITORY)-setup-solo:latest $(REPOSITORY)-setup-solo:$(TAG)
	docker push $(REPOSITORY)-setup-solo:latest
	docker push $(REPOSITORY)-setup-solo:$(TAG)

compile-go: go.sum
	GO111MODULE=on go build -v -buildmode=c-shared -o lib/libagcosmosdaemon.so lib/agcosmosdaemon.go
	-install_name_tool -id `pwd`/lib/libagcosmosdaemon.so lib/libagcosmosdaemon.so

build: compile-go

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
	cd t1 && ../bin/ag-solo set-gci-ingress --chainID=$(CHAIN_ID) `../calc-gci.js ~/.ag-chain-cosmos/config/genesis.json` `../calc-rpcport.js ~/.ag-chain-cosmos/config/config.toml`

start-ag-solo-connected-to-local:
	-rm -r t1
	bin/ag-solo init t1
	$(MAKE) set-local-gci-ingress
	cd t1 && ../bin/ag-solo start

install-pserver:
	python3 -mvenv ve3
	ve3/bin/pip install -U setuptools wheel
	ve3/bin/pip install --editable ./provisioning-server

run-pserver:
	ve3/bin/ag-pserver --listen tcp:8001 --controller tcp:localhost:8002

install-setup-client:
	python3 -mvenv ve3-client
	ve3-client/bin/pip install -U setuptools wheel
	ve3-client/bin/pip install --editable ./setup-solo
run-setup-client:
	ve3-client/bin/ag-setup-solo
