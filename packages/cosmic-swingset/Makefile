REPOSITORY = agoric/cosmic-swingset
CHAIN_ID = agoric
INITIAL_TOKENS = 1000agmedallion

# By default, make the fake chain in scenario3 produce
# "blocks" at 5-second intervals.
FAKE_CHAIN_DELAY = 5

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

MOD_READONLY = -mod=readonly

NAME := $(shell sed -ne 's/.*"name": "\([^"]*\)".*/\1/p' package.json)
VERSION := $(shell sed -ne 's/.*"version": "\([^"]*\)".*/\1/p' package.json)
COMMIT := $(shell git log -1 --format='%H' || cat lib/git-revision.txt)

ldflags = -X github.com/cosmos/cosmos-sdk/version.Name=$(NAME) \
	-X github.com/cosmos/cosmos-sdk/version.ServerName=ag-chain-cosmos \
	-X github.com/cosmos/cosmos-sdk/version.ClientName=ag-cosmos-helper \
	-X github.com/cosmos/cosmos-sdk/version.Version=$(VERSION) \
	-X github.com/cosmos/cosmos-sdk/version.Commit=$(COMMIT) \
	-X "github.com/cosmos/cosmos-sdk/version.BuildTags=$(build_tags)"

BUILD_FLAGS := -tags "$(build_tags)" -ldflags '$(ldflags)'

include Makefile.ledger
all: build-cosmos install

scenario0-setup:
	rm -rf ~/.ag-chain-cosmos
	python3 -mvenv ve3
	ve3/bin/pip install setup-solo/

scenario0-run-client:
	AG_SOLO_BASEDIR=t9 ve3/bin/ag-setup-solo --webhost=127.0.0.1:$(BASE_PORT)

scenario0-run-chain:
	@echo 'No local chain needs to run in scenario0'

scenario1-setup: scenario0-setup
scenario1-run-chain:
	@test "`uname -s`" = Linux || \
		{ echo 'Must run under Linux; use "(cd ../deployment && make docker-build) && docker/ag-setup-cosmos bootstrap"'; exit 1; }
	AG_SETUP_COSMOS_HOME=t8 setup/ag-setup-cosmos bootstrap

scenario1-run-client:
	AG_SOLO_BASEDIR=t7 ve3/bin/ag-setup-solo --webhost=127.0.0.1:$(BASE_PORT)

AGC = ./lib/ag-chain-cosmos
scenario2-setup: build-cosmos scenario2-setup-nobuild
scenario2-setup-nobuild:
	rm -rf ~/.ag-chain-cosmos
	$(AGC) init scenario2-chain --chain-id=$(CHAIN_ID)
	rm -rf t1
	mkdir t1
	set -e; for port in `seq $(BASE_PORT) $$(($(BASE_PORT) + $(NUM_SOLOS) - 1))`; do \
		bin/ag-solo init t1/$$port --webport=$$port; \
		case $$port in \
			$(BASE_PORT)) toks=$(INITIAL_TOKENS),100000000uagstake ;; \
			*) toks=1agmedallion ;; \
		esac; \
		$(AGC) add-genesis-account `cat t1/$$port/ag-cosmos-helper-address` $$toks; \
	done
	$(AGC) gentx --keyring-backend=test --home-client=t1/$(BASE_PORT)/ag-cosmos-helper-statedir \
		--name=ag-solo --amount=1000000uagstake
	$(AGC) collect-gentxs
	$(AGC) validate-genesis
	../deployment/set-json.js ~/.ag-chain-cosmos/config/genesis.json --agoric-genesis-overrides
	$(MAKE) set-local-gci-ingress
	@echo "ROLE=two_chain BOOT_ADDRESS=\`cat t1/$(BASE_PORT)/ag-cosmos-helper-address\` $(AGC) start"
	@echo "(cd t1/$(BASE_PORT) && ../bin/ag-solo start --role=two_client)"

scenario2-run-chain:
	set -e; ba=; for acha in t1/*/ag-cosmos-helper-address; do \
		ba="$$ba "`cat $$acha`; \
	done; \
	ROLE=two_chain BOOT_ADDRESS="$$ba" $(NODE_DEBUG) \
	  `$(BREAK_CHAIN) && echo --inspect-brk` $(AGC) start --pruning=nothing
scenario2-run-client:
	cd t1/$(BASE_PORT) && ../../bin/ag-solo start --role=two_client

# scenario3 is a single JS process without any Golang.  However,
# the client and the chain within the process run two separate
# kernels.  There is an artificial delay when handling messages
# destined for the chain kernel, to prevent you from accidentally
# creating programs that won't work on the real blockchain.
#
# If you still want the client/chain separation without delay,
# then run: make scenario3-setup FAKE_CHAIN_DELAY=0
scenario3-setup:
	rm -rf t3
	bin/ag-solo init t3 --egresses=fake
	(cd t3 && \
			../bin/ag-solo set-fake-chain --role=two_chain --delay=$(FAKE_CHAIN_DELAY) myFakeGCI)
	@echo 'Execute `make scenario3-run` to run the client and simulated chain'

# This runs both the client and the fake chain.
scenario3-run-client: scenario3-run
scenario3-run:
	cd t3 && ../bin/ag-solo start --role=two_client

# These rules are the old scenario3.  No fake delay at all.
# It's generally better to use the new scenario3.
deprecated-scenario3-setup:
	rm -rf t3
	bin/ag-solo init t3 --egresses=none

deprecated-scenario3-run-client:
	cd t3 && ../bin/ag-solo start --role=three_client

docker-pull:
	for f in '' -pserver -setup -setup-solo -solo; do \
		docker pull $(REPOSITORY)$$f:latest || exit $$?; \
	done

docker-install: docker-pull
	install -m 755 docker/* /usr/local/bin/

compile-go: go.sum
	go build -v $(MOD_READONLY) $(BUILD_FLAGS) -buildmode=c-shared -o lib/libagcosmosdaemon.so lib/agcosmosdaemon.go
	test "`uname -s 2>/dev/null`" != Darwin || install_name_tool -id `pwd`/lib/libagcosmosdaemon.so lib/libagcosmosdaemon.so

build-cosmos: compile-go node-compile-gyp install

compile-debug:
	go install -v $(MOD_READONLY) $(BUILD_FLAGS) ./cmd/ag-chain-cosmos

# We need this so that node-gyp can be found.
node-compile-gyp:
	if yarn -v >/dev/null 2>&1; then \
		yarn build:gyp; \
	else \
		npm run build:gyp; \
	fi

# Only run from the package.json build:gyp script.
compile-gyp:
	cp binding.gyp.in binding.gyp
	node-gyp configure build || { status=$$?; rm -f binding.gyp; exit $$status; }
	rm -f binding.gyp

install: go.sum
	go install -v $(MOD_READONLY) $(BUILD_FLAGS) ./cmd/ag-cosmos-helper
	bindir="$${GOBIN-$${GOPATH-$$HOME/go}/bin}"; ln -sf "$$PWD/lib/ag-chain-cosmos" "$$bindir/ag-chain-cosmos"

go.sum: go.mod
	@echo "--> Ensure dependencies have not been modified"
	GO111MODULE=on go mod verify

start-ag-solo:
	rm -rf t1
	bin/ag-solo init t1
	cd t1 && ../bin/ag-solo start

show-local-gci:
	@./calc-gci.js ~/.ag-chain-cosmos/config/genesis.json

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

###############################################################################
###                                Protobuf                                 ###
###############################################################################

proto-all: proto-gen proto-lint proto-check-breaking

proto-gen:
	@./scripts/protocgen.sh

proto-lint:
	@buf check lint --error-format=json

proto-check-breaking:
	@buf check breaking --against-input '.git#branch=master'

GOGO_PROTO_URL   = https://raw.githubusercontent.com/regen-network/protobuf/cosmos
COSMOS_SDK_URL   = https://raw.githubusercontent.com/cosmos/cosmos-sdk/master
COSMOS_PROTO_URL = https://raw.githubusercontent.com/regen-network/cosmos-proto/master

GOGO_PROTO_TYPES    = third_party/proto/gogoproto
COSMOS_PROTO_TYPES  = third_party/proto/cosmos-proto
SDK_PROTO_TYPES     = third_party/proto/cosmos-sdk/types
AUTH_PROTO_TYPES    = third_party/proto/cosmos-sdk/x/auth/types
VESTING_PROTO_TYPES = third_party/proto/cosmos-sdk/x/auth/vesting/types
SUPPLY_PROTO_TYPES  = third_party/proto/cosmos-sdk/x/supply/types

proto-install:
	@echo "Go to github.com/protocolbuffers/protobuf/releases"
	go get -u github.com/golang/protobuf/protoc-gen-go

proto-update-deps:
	@mkdir -p $(GOGO_PROTO_TYPES)
	@curl -sSL $(GOGO_PROTO_URL)/gogoproto/gogo.proto > $(GOGO_PROTO_TYPES)/gogo.proto

	@mkdir -p $(COSMOS_PROTO_TYPES)
	@curl -sSL $(COSMOS_PROTO_URL)/cosmos.proto > $(COSMOS_PROTO_TYPES)/cosmos.proto

	@mkdir -p $(SDK_PROTO_TYPES)
	@curl -sSL $(COSMOS_SDK_URL)/types/types.proto > $(SDK_PROTO_TYPES)/types.proto

	@mkdir -p $(AUTH_PROTO_TYPES)
	@curl -sSL $(COSMOS_SDK_URL)/x/auth/types/types.proto > $(AUTH_PROTO_TYPES)/types.proto
	@sed -i '' '5 s|types/|third_party/proto/cosmos-sdk/types/|g' $(AUTH_PROTO_TYPES)/types.proto

	@mkdir -p $(VESTING_PROTO_TYPES)
	@curl -sSL $(COSMOS_SDK_URL)/x/auth/vesting/types/types.proto > $(VESTING_PROTO_TYPES)/types.proto
	@sed -i '' '5 s|types/|third_party/proto/cosmos-sdk/types/|g' $(VESTING_PROTO_TYPES)/types.proto
	@sed -i '' '6 s|x/auth/types/|third_party/proto/cosmos-sdk/x/auth/types/|g' $(VESTING_PROTO_TYPES)/types.proto

	@mkdir -p $(SUPPLY_PROTO_TYPES)
	@curl -sSL $(COSMOS_SDK_URL)/x/supply/types/types.proto > $(SUPPLY_PROTO_TYPES)/types.proto
	@sed -i '' '5 s|types/|third_party/proto/cosmos-sdk/types/|g' $(SUPPLY_PROTO_TYPES)/types.proto
	@sed -i '' '6 s|x/auth/types/|third_party/proto/cosmos-sdk/x/auth/types/|g' $(SUPPLY_PROTO_TYPES)/types.proto

.PHONY: proto-all proto-gen proto-lint proto-check-breaking proto-update-deps
