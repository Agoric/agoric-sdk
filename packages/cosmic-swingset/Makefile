REPOSITORY = agoric/cosmic-swingset
TAG := $(shell test ! -f package.json || sed -ne 's/.*"version": "\(.*\)".*/\1/p' package.json)
DO_PUSH_LATEST :=
CHAIN_ID = agoric
DEV :=
INITIAL_TOKENS = 1000agmedallion

NUM_SOLOS?=1
BASE_PORT?=8000

ifneq ("$(wildcard /vagrant)","")
# Within a VM.  We need to get to the outside.
INSPECT_ADDRESS = 0.0.0.0
else
# On a host machine.  Stay here.
INSPECT_ADDRESS = 127.0.0.1
endif

BREAK_CHAIN = false
NODE_DEBUG = node --inspect-port=$(INSPECT_ADDRESS):9229

MOD_READONLY = # -mod=readonly

include Makefile.ledger
all: build install

scenario0-setup:
	rm -rf ~/.ag-chain-cosmos
	rm -f ag-cosmos-chain-state.json
	python3 -mvenv ve3
	ve3/bin/pip install setup-solo/

scenario0-run-client:
	AG_SOLO_BASEDIR=t9 ve3/bin/ag-setup-solo --webhost=127.0.0.1:$(BASE_PORT)

scenario0-run-chain:
	@echo 'No local chain needs to run in scenario0'

scenario1-setup: scenario0-setup
scenario1-run-chain:
	@test "`uname -s`" = Linux || \
		{ echo 'Must run under Linux; use "make docker-build && docker/ag-setup-cosmos bootstrap"'; exit 1; }
	AG_SETUP_COSMOS_HOME=t8 setup/ag-setup-cosmos bootstrap

scenario1-run-client:
	AG_SOLO_BASEDIR=t7 ve3/bin/ag-setup-solo --webhost=127.0.0.1:$(BASE_PORT)

AGC = ./lib/ag-chain-cosmos
scenario2-setup:
	rm -rf ~/.ag-chain-cosmos
	rm -f ag-cosmos-chain-state.json
	$(AGC) init scenario2-chain --chain-id=$(CHAIN_ID)
	rm -rf t1
	mkdir t1
	set -e; for port in `seq $(BASE_PORT) $$(($(BASE_PORT) + $(NUM_SOLOS) - 1))`; do \
		bin/ag-solo init t1/$$port --webport=$$port; \
		case $$port in \
			$(BASE_PORT)) toks=$(INITIAL_TOKENS),100000000stake ;; \
			*) toks=1agmedallion ;; \
		esac; \
		$(AGC) add-genesis-account `cat t1/$$port/ag-cosmos-helper-address` $$toks; \
	done
	echo 'mmmmmmmm' | $(AGC) gentx --home-client=t1/$(BASE_PORT)/ag-cosmos-helper-statedir --name=ag-solo --amount=1000000stake
	$(AGC) collect-gentxs
	$(AGC) validate-genesis
	./setup/set-json.js ~/.ag-chain-cosmos/config/genesis.json --agoric-genesis-overrides
	$(MAKE) set-local-gci-ingress
	@echo "ROLE=two_chain BOOT_ADDRESS=\`cat t1/$(BASE_PORT)/ag-cosmos-helper-address\` agc start"
	@echo "(cd t1/$(BASE_PORT) && ../bin/ag-solo start --role=two_client)"

scenario2-run-chain:
	set -e; ba=; for acha in t1/*/ag-cosmos-helper-address; do \
		ba="$$ba "`cat $$acha`; \
	done; \
	ROLE=two_chain BOOT_ADDRESS="$$ba" $(NODE_DEBUG) \
	  `$(BREAK_CHAIN) && echo --inspect-brk` $(AGC) start
scenario2-run-client:
	cd t1/$(BASE_PORT) && ../../bin/ag-solo start --role=two_client

scenario3-setup:
	rm -rf t3
	bin/ag-solo init t3 --egresses=none
	@echo 'Ignore advice above, instead run `make scenario3-run-client`'
scenario3-run-client:
	cd t3 && ../bin/ag-solo start --role=three_client
scenario3-run-chain:
	@echo 'No local chain needs to run in scenario3'

docker-pull:
	for f in '' -pserver -setup -setup-solo -solo; do \
		docker pull $(REPOSITORY)$$f:latest || exit $$?; \
	done

docker-install: docker-pull
	install -m 755 docker/* /usr/local/bin/

docker-build: docker-build-base docker-build-base$(DEV) docker-build-solo docker-build-pserver docker-build-setup docker-build-setup-solo

docker-build-base-dev:
	docker build -t $(REPOSITORY)-dev:latest --file=../docker/Dockerfile.dev ..

docker-build-setup:
	docker build -t $(REPOSITORY)-setup:latest --build-arg=REPO=$(REPOSITORY)$(DEV) ./setup

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
	docker tag $(REPOSITORY)-setup:latest$(DEV) $(REPOSITORY)-setup:$(TAG)$(DEV)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-setup:latest$(DEV)
	docker push $(REPOSITORY)-setup:$(TAG)$(DEV)

docker-push-base:
	docker tag $(REPOSITORY)$(DEV):latest $(REPOSITORY)$(DEV):$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)$(DEV):latest
	docker push $(REPOSITORY)$(DEV):$(TAG)

docker-push-pserver:
	docker tag $(REPOSITORY)-pserver:latest $(REPOSITORY)-pserver:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-pserver:latest
	docker push $(REPOSITORY)-pserver:$(TAG)

docker-push-solo:
	docker tag $(REPOSITORY)-solo:latest $(REPOSITORY)-solo:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-solo:latest
	docker push $(REPOSITORY)-solo:$(TAG)

docker-push-setup-solo:
	docker tag $(REPOSITORY)-setup-solo:latest $(REPOSITORY)-setup-solo:$(TAG)
	$(DO_PUSH_LATEST) docker push $(REPOSITORY)-setup-solo:latest
	docker push $(REPOSITORY)-setup-solo:$(TAG)

compile-go: go.sum
	go build -v $(MOD_READONLY) -buildmode=c-shared -o lib/libagcosmosdaemon.so lib/agcosmosdaemon.go
	test "`uname -s 2>/dev/null`" != Darwin || install_name_tool -id `pwd`/lib/libagcosmosdaemon.so lib/libagcosmosdaemon.so

build: compile-go

compile-node:
	test ! -d node_modules/bindings || npm run build

install: go.sum
	go install -v $(MOD_READONLY) -tags "$(build_tags)" ./cmd/ag-cosmos-helper

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify

start-ag-solo:
	rm -rf t1
	bin/ag-solo init t1
	cd t1 && ../bin/ag-solo start

show-local-gci:
	@./calc-gci.js ~/.ag-cosmos-chain/config/genesis.json

set-local-gci-ingress:
	set -e; \
	gci=`./calc-gci.js ~/.ag-chain-cosmos/config/genesis.json`; \
	rpcport=`./calc-rpcport.js ~/.ag-chain-cosmos/config/config.toml`; \
	for dir in t1/*; do \
		(cd $$dir && \
			../../bin/ag-solo set-gci-ingress --chainID=$(CHAIN_ID) $$gci $$rpcport); \
	done

start-ag-solo-connected-to-local:
	rm -rf t1
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
