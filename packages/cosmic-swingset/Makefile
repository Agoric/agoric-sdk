REPOSITORY = agoric/cosmic-swingset
CHAIN_ID = agoric
INITIAL_TOKENS = 1000000000000uag

GOSRC = ../../golang/cosmos

# By default, make the fake chain in scenario3 produce
# "blocks" as soon as they come in.
FAKE_CHAIN_DELAY = 0

NUM_SOLOS?=1
BASE_PORT?=8000

OTEL_EXPORTER_PROMETHEUS_PORT = 9461

# On a host machine.  Stay here.
INSPECT_ADDRESS = 127.0.0.1

BREAK_CHAIN = false
NODE_DEBUG = node --inspect-port=$(INSPECT_ADDRESS):9229

BIN := $(shell echo $${GOBIN-$${GOPATH-$$HOME/go}/bin})

all: build-chain install install-helper

client: build-helper install install-helper

scenario0-setup:
	mkdir -p t9
	rm -rf t9/$(BASE_PORT)

scenario0-run scenario0-run-client:
	AG_SOLO_BASEDIR=$$PWD/t9/$(BASE_PORT) bin/ag-solo setup --webport=$(BASE_PORT)
scenario0-run-chain:
	@echo 'We use the Agoric testnet, not a local chain.'

scenario1-setup: scenario0-setup
scenario1-run-chain:
	@test "`uname -s`" = Linux || \
		{ echo 'Must run under Linux; use "(cd ../deployment && make docker-build) && docker/ag-setup-cosmos bootstrap"'; exit 1; }
	AG_SETUP_COSMOS_HOME=t8 ../deployment/ag-setup-cosmos bootstrap

scenario1-run-client:
	AG_SOLO_BASEDIR=$$PWD/t9/$(BASE_PORT) bin/ag-solo setup --network-config=http://localhost:8001/network-config --webport=$(BASE_PORT)

AGC = ./bin/ag-chain-cosmos
AGCH = ag-cosmos-helper
scenario2-setup: all scenario2-setup-nobuild
scenario2-setup-nobuild:
	rm -rf t1
	mkdir -p t1/bootstrap
	# Init the chain node.
	$(AGC) --home=t1/n0 init scenario2-chain --chain-id=$(CHAIN_ID)
	# Init all the ag-solos.
	set -e; for port in `seq $(BASE_PORT) $$(($(BASE_PORT) + $(NUM_SOLOS) - 1))`; do \
		bin/ag-solo init t1/$$port --webport=$$port; \
	done
	# Create the bootstrap account.
	$(AGCH) --home=t1/bootstrap keys add bootstrap --keyring-backend=test
	$(AGCH) --home=t1/bootstrap keys show -a bootstrap --keyring-backend=test > t1/bootstrap-address
	$(AGC) --home=t1/n0 add-genesis-account `cat t1/bootstrap-address` 100000000uagstake,100provisionpass,100sendpacketpass
	# Create the (singleton) chain node.
	$(AGC) --home=t1/n0 --keyring-dir=t1/bootstrap gentx --keyring-backend=test bootstrap 1000000uagstake --chain-id=$(CHAIN_ID)
	$(AGC) --home=t1/n0 collect-gentxs
	$(AGC) --home=t1/n0 validate-genesis
	../agoric-cli/bin/agoric set-defaults --export-metrics ag-chain-cosmos t1/n0/config
	# Set the chain address in all the ag-solos.
	$(MAKE) set-local-gci-ingress

scenario2-run-chain:
	OTEL_EXPORTER_PROMETHEUS_PORT=$(OTEL_EXPORTER_PROMETHEUS_PORT) \
		$(AGC) `$(BREAK_CHAIN) && echo --inspect-brk` --home=t1/n0 start --log_level=warn

# Provision and start a client.
scenario2-run-client: t1-provision-one-with-powers t1-start-ag-solo

# Provision the ag-solo from an provisionpass-holding address (idempotent).
t1-provision-one-with-powers:
	addr=$$(cat t1/$(BASE_PORT)/ag-cosmos-helper-address); \
	  $(AGCH) --home=t1/bootstrap query swingset egress $$addr --chain-id=$(CHAIN_ID) || \
	  $(AGCH) --home=t1/bootstrap tx swingset provision-one --keyring-backend=test --from=bootstrap \
		  --gas=auto --gas-adjustment=1.2 --broadcast-mode=block --yes --chain-id=$(CHAIN_ID) \
		  t1/$(BASE_PORT) $$addr agoric.vattp | tee /dev/stderr | grep -q '"code":0'

t1-provision-one:
	addr=$$(cat t1/$(BASE_PORT)/ag-cosmos-helper-address); \
	  $(AGCH) --home=t1/bootstrap query swingset egress $$addr --chain-id=$(CHAIN_ID) || \
	  $(AGCH) --home=t1/bootstrap tx swingset provision-one --keyring-backend=test --from=bootstrap \
		  --gas=auto --gas-adjustment=1.2 --broadcast-mode=block --yes --chain-id=$(CHAIN_ID) \
		  t1/$(BASE_PORT) $$addr | tee /dev/stderr | grep -q '"code":0'

# Actually start the ag-solo.
t1-start-ag-solo:
	cd t1/$(BASE_PORT) && ../../bin/ag-solo start

# scenario3 is a single JS process without any Golang.  However,
# the client and the chain within the process run two separate
# kernels.  There is an artificial delay when handling messages
# destined for the chain kernel, to prevent you from accidentally
# creating programs that won't work on the real blockchain.
#
# If you still want the client/chain separation without delay,
# then run: make scenario3-setup FAKE_CHAIN_DELAY=0
VATWORKER=local
scenario3-setup:
	rm -rf t3
	bin/ag-solo init t3 --egresses=fake --webport=$(BASE_PORT) --defaultManagerType=$(VATWORKER)
	@echo 'Execute `make scenario3-run` to run the client and simulated chain'

# This runs both the client and the fake chain.
scenario3-run-client: scenario3-run
# Set the fake chain here in case the delay has changed.
scenario3-run:
	cd t3 && \
			../bin/ag-solo set-fake-chain --delay=$(FAKE_CHAIN_DELAY) mySimGCI
	cd t3 && \
		OTEL_EXPORTER_PROMETHEUS_PORT=$(OTEL_EXPORTER_PROMETHEUS_PORT) \
		../bin/ag-solo start

docker-pull:
	for f in '' -setup -solo; do \
		docker pull $(REPOSITORY)$$f:latest || exit $$?; \
	done

docker-install: docker-pull
	install -m 755 docker/* /usr/local/bin/

build-chain:
	$(MAKE) -C $(GOSRC) all

build-helper:
	$(MAKE) -C $(GOSRC) compile-helper

install-helper:
	install -c $(GOSRC)/build/ag-cosmos-helper "$(BIN)/ag-cosmos-helper"

install:
	mkdir -p "$(BIN)"
	ln -sf "$$PWD/bin/ag-chain-cosmos" "$$PWD/bin/ag-nchainz" "$(BIN)/"

start-ag-solo:
	rm -rf t1
	bin/ag-solo init t1
	cd t1 && ../bin/ag-solo start

show-local-gci:
	@./calc-gci.js ~/.ag-chain-cosmos/config/genesis.json

set-local-gci-ingress:
	set -e; \
	gci=`./calc-gci.js t1/n0/config/genesis.json`; \
	rpcport=`./calc-rpcport.js t1/n0/config/config.toml`; \
	for dir in t1/[0-9]*; do \
		(cd $$dir && \
			../../bin/ag-solo set-gci-ingress --chainID=$(CHAIN_ID) $$gci $$rpcport); \
	done
