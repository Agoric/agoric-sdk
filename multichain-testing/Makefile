# see https://github.com/cosmology-tech/starship/blob/0e18757b8393357fc66426c5ee23da4ccf760e74/examples/getting-started/Makefile

NAME = agoric-multichain-testing
FILE = config.yaml

HELM_REPO_URL = https://agoric-labs.github.io/starship
HELM_REPO = starship
HELM_CHART = devnet
NAMESPACE := $(shell ./scripts/get-namespace.sh)

SS = yarn starship
SSOPTS = --config $(FILE) --name $(NAME) --repoUrl $(HELM_REPO_URL) \
	--repo $(HELM_REPO) --chart $(HELM_REPO)/$(HELM_CHART) --namespace $(NAMESPACE)
STARSHIP = $(SS) $(SSOPTS)

# Test command for YMax-related tests
TESTYMAX = ava --config ava.ymd.config.js

###############################################################################
###                              All commands                               ###
###############################################################################

.PHONY: setup
setup: setup-kind
	$(STARSHIP) setup

.PHONY: stop
stop: sstop delete

.PHONY: sstop
sstop:
	$(STARSHIP) stop

.PHONY: clean
clean: stop clean-kind

# To support a debug cycle like:
#  make stop rebuild start && yarn test:main test/ibc-transfers.ts
.PHONY: rebuild
rebuild:
	$(MAKE) -C ../packages/deployment docker-build-sdk TAG=dev
	kind load docker-image ghcr.io/agoric/agoric-sdk:dev --name $(KIND_CLUSTER)

###############################################################################
###                          Dependency check                               ###
###############################################################################

.PHONY: setup-deps
setup-deps:
	$(STARSHIP) install

###############################################################################
###                              Helm Charts                                ###
###############################################################################

.PHONY: install
install:
	$(STARSHIP) deploy

.PHONY: delete
delete:
	-helm repo remove $(HELM_REPO)
	-$(STARSHIP) delete || helm delete $(NAME)

###############################################################################
###                                 Port forward                            ###
###############################################################################

.PHONY: port-forward
port-forward:
	$(STARSHIP) start-ports

.PHONY: stop-forward
stop-forward:
	$(STARSHIP) stop-ports

###############################################################################
###                          Local Kind Setup                               ###
###############################################################################
KIND_CLUSTER=agship

.PHONY: setup-kind
setup-kind:
	kind create cluster --name $(KIND_CLUSTER)

.PHONY: clean-kind
clean-kind:
	-kind delete cluster --name $(KIND_CLUSTER)

###############################################################################
###                          Agoric Setup                                   ###
###############################################################################

# add address
add-address:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys add user1

fund-provision-pool:
	scripts/fund-provision-pool.ts

register-bank-assets:
	scripts/fetch-starship-chain-info.ts && \
	scripts/deploy-cli.ts ../packages/builders/scripts/orchestration/register-interchain-bank-assets.build.js \
		assets="$$(scripts/make-bank-asset-info.ts)"

ADDR=agoric1ldmtatp24qlllgxmrsjzcpe20fvlkp448zcuce
COIN=1000000000uist,25000000ubld

fund-wallet:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd tx bank send faucet $(ADDR) $(COIN) -y -b block

provision-smart-wallet:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- agd tx swingset provision-one wallet $(ADDR) SMART_WALLET --from $(ADDR) -y -b block

# view agoric swingset logs from slog file, until we can set `DEBUG=SwingSet:vat,SwingSet:ls`
tail-slog:
	kubectl exec -i agoriclocal-genesis-0 -c validator -- tail -f slog.slog



###############################################################################
###                          Noble Setup                                   ###
###############################################################################

.PHONY: create-noble-swap-pool
create-noble-swap-pool:
	scripts/create-noble-swap-pool.ts

###############################################################################
###                           Start All                                     ###
###############################################################################

.PHONY: wait-for-pods
wait-for-pods:
	$(STARSHIP) wait-for-pods


set-namespace-with-context:
	kubectl config set-context --current --namespace=$(NAMESPACE)

.PHONY: start
start: set-namespace-with-context sstart fund-provision-pool register-bank-assets create-noble-swap-pool

.PHONY: sstart
sstart:
	$(STARSHIP) start

##
# YMax testing for https://github.com/Agoric/agoric-sdk/issues/11536

deploy-ymax: poc-asset agoricNames.chain
	$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m ymax-deployed || \
	( 	(cd ../packages/portfolio-deploy; yarn build) && \
		./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/portfolio.build.js)

redeploy-ymax: poc-asset agoricNames.chain
	date -u
	(cd ../packages/portfolio-deploy; yarn build)
	time ./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/portfolio.build.js
	@echo
	@echo
	@echo ======= DEPLOY AGAIN to address the "old code" issue
	date -u
	time ./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/portfolio.build.js
	date -u

# cf. ymax-tool.ts
TRADER1=noble18qlqfelxhe7tszqqprm2eqdpzt9s6ry025y3j5
TRADER1ag=agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl
TRADER1_MNEMONIC = "cause eight cattle slot course mail more aware vapor slab hobby match"

poc-asset: beneficiary-wallet
	$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m poc-asset || \
	./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/access-token-setup.build.js \
		beneficiary=$(TRADER1ag)

# Calling ./scripts/ymax-tool.ts twice to create a smart wallet so that TRADER1
# can receive the poc tokens
beneficiary-wallet: ./scripts/ymax-tool.ts
	$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m beneficiary-wallet || \
	(make ADDR=$(TRADER1ag) fund-wallet && \
	MNEMONIC=$(TRADER1_MNEMONIC) ./scripts/ymax-tool.ts 0.1 --exit-success --skip-poll && \
	MNEMONIC=$(TRADER1_MNEMONIC) ./scripts/ymax-tool.ts 0.1 --exit-success)


agoricNames.chain:
	$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m chain-info || \
	./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/chain-info.build.js \
		net=local peer=noble:connection-0:channel-0:uusdc

##
# Using ymax
open-with-usdn: deploy-ymax usdc-available ./scripts/ymax-tool.ts
	(MNEMONIC=$(TRADER1_MNEMONIC) ./scripts/ymax-tool.ts $(CONTRACT_FLAG) 1.03)

usdc-available: ./scripts/noble-usdn-lab.ts
	$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m usdc-available || \
	( \
		FAUCET=trader1 NET=starship ./scripts/noble-usdn-lab.ts && \
		TXFR=9950000 NET=starship ./scripts/noble-usdn-lab.ts && \
		( \
			$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m usdc-available || { \
				sleep 3 && \
				$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m usdc-available || { \
					sleep 5 && \
					$(TESTYMAX) test/$(CONTRACT_INSTANCE) -m usdc-available; \
				}; \
			} \
		) \
	)


DEPLOY=../packages/portfolio-deploy

# Contract instance to use (defaults to ymax0 if not set)
CONTRACT_INSTANCE ?= ymax0

clean-ymax:
	rm -rf $(DEPLOY)/dist/

,$(CONTRACT_INSTANCE)-bundle-id: $(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json
	(printf "b1-"; jq -r .endoZipBase64Sha512 $(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json) >$@

$(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json: $(DEPLOY)/dist/portfolio.contract.bundle.js
	(cd $(DEPLOY); \
	 npx bundle-source --cache-json dist/ ./dist/portfolio.contract.bundle.js $(CONTRACT_INSTANCE))

$(DEPLOY)/dist/portfolio.contract.bundle.js:
	(cd $(DEPLOY); yarn build)

PUBLISHER=gov2.devnet
publish-ymax: ,$(CONTRACT_INSTANCE)-installed

AGORIC_NET ?= devnet
YMAX_TOOL=./scripts/ymax-tool.ts

,$(CONTRACT_INSTANCE)-installed: $(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json
	agd keys --keyring-backend=test show $(PUBLISHER)
	AGORIC_NET=devnet ./scripts/install-bundle.ts $< >$@ || (rm $@; false)

,privateArgsOverrides.json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --buildEthOverrides >$@ || (rm $@; false)

yctrl-redeploy: ,$(CONTRACT_INSTANCE)-deployed

NETCONFIG=https://devnet.agoric.net/network-config
CONTRACT_FLAG=--contract=$(CONTRACT_INSTANCE)

,$(CONTRACT_INSTANCE)-deployed: $(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json ,$(CONTRACT_INSTANCE)-bundle-id ,$(CONTRACT_INSTANCE)-installed ,privateArgsOverrides.json
	@[ -n "$$MNEMONIC" ] || (echo "ymaxControl MNEMONIC not set; see gov keys sheet"; false)
	if [ -n "$$REASON" ]; then AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --terminate "$(REASON)"; else true; fi
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --installAndStart $$(cat ,$(CONTRACT_INSTANCE)-bundle-id) <,privateArgsOverrides.json
	agoric follow -B $(NETCONFIG) -lF :published.agoricNames.instance >$@ || (rm $@; false)

,upgrade: $(DEPLOY)/dist/bundle-$(CONTRACT_INSTANCE).json ,$(CONTRACT_INSTANCE)-bundle-id ,$(CONTRACT_INSTANCE)-installed
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --upgrade $$(cat ,$(CONTRACT_INSTANCE)-bundle-id)

,creatorFacet: ,$(CONTRACT_INSTANCE)-deployed
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --getCreatorFacet
	touch $@

##
# Introduce parties (planner and resolver) for contract instances
introduce-parties: ,invitePlanner ,inviteResolver

# see gov keys sheet
PLANNER ?= agoric140yw0u2qrvmrgp33ejpddgnrwpm74vpfpx5v7n

,invitePlanner: ,creatorFacet
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --invitePlanner $(PLANNER)
	touch $@
	@echo now use planner MNEMONIC: ymax-tool.ts $(CONTRACT_FLAG) --redeem --description planner

RESOLVER ?= $(PLANNER)
,inviteResolver: ,creatorFacet
	AGORIC_NET=$(AGORIC_NET) \
		$(YMAX_TOOL) $(CONTRACT_FLAG) --inviteResolver $(RESOLVER)
	touch $@
	@echo now use resolver MNEMONIC: ymax-tool.ts $(CONTRACT_FLAG) --redeem --description resolver

check-vstorage: ,vstorage-outdated-$(AGORIC_NET).json

,vstorage-outdated-$(AGORIC_NET).json:
	@echo "Using AGORIC_NET=$(AGORIC_NET)"
	AGORIC_NET=$(AGORIC_NET) $(YMAX_TOOL) --checkStorage >$@ || \
		(rm $@; false)

DEV_NODE=https://devnet.rpc.agoric.net:443
SIG_OPTS=--chain-id=agoricdev-25 --gas-adjustment=1.5 --gas=auto
fund-fee-acct:
	$(eval FEE_ACCT := $(shell agd q vstorage data published.$(CONTRACT_INSTANCE) --node $(DEV_NODE) -o json | jq -r '.value | fromjson | .values[0] | fromjson | .body | fromjson | .contractAccount'))
	@echo "Funding fee account: $(FEE_ACCT)"
	agd tx bank send gov1.devnet $(FEE_ACCT) 120000000ubld --keyring-backend test -y -b block --node=$(DEV_NODE) $(SIG_OPTS)

aave-eth:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Aave":0.1}' --target-allocation '{"Aave_Ethereum":100}'

compound-eth:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Compound":1.25}' --target-allocation '{"Compound_Ethereum":100}'

compound-withdraw:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --withdraw-from-compound

aave-ava:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Aave":0.1}' --target-allocation '{"Aave_Avalanche":100}'

aave-arb:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Aave":0.1}' --target-allocation '{"Aave_Arbitrum":100}'

compound-arb:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Compound":0.1}' --target-allocation '{"Compound_Arbitrum":100}'

aave-base:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Aave":0.1}' --target-allocation '{"Aave_Base":100}'

compound-base:
	@[ -n "$$MNEMONIC" ] || (echo "trader MNEMONIC not set; see noble-usdn-lab.ts"; false)
	AGORIC_NET=devnet ./scripts/ymax-tool.ts $(CONTRACT_FLAG) --positions '{"Compound":0.1}' --target-allocation '{"Compound_Base":100}'
