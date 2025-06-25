# see https://github.com/cosmology-tech/starship/blob/0e18757b8393357fc66426c5ee23da4ccf760e74/examples/getting-started/Makefile

NAME = agoric-multichain-testing
FILE = config.yaml

HELM_REPO_URL = https://agoric-labs.github.io/starship
HELM_REPO = starship
HELM_CHART = devnet

SS = yarn starship
SSOPTS = --config $(FILE) --name $(NAME) --repoUrl $(HELM_REPO_URL) \
	--repo $(HELM_REPO) --chart $(HELM_REPO)/$(HELM_CHART)
STARSHIP = $(SS) $(SSOPTS)

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
	scripts/deploy-cli.ts src/register-interchain-bank-assets.builder.js \
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

.PHONY: start
start: sstart fund-provision-pool register-bank-assets create-noble-swap-pool

.PHONY: sstart
sstart:
	$(STARSHIP) start

##
# YMax testing for https://github.com/Agoric/agoric-sdk/issues/11536

deploy-ymax: poc-asset agoricNames.chain
	yarn test:main test/ymax0 -m ymax-deployed || \
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
poc-asset: beneficiary-wallet
	yarn test:main test/ymax0 -m poc-asset || \
	./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/access-token-setup.build.js \
		beneficiary=$(TRADER1ag)

beneficiary-wallet: ./scripts/ymax-tool.ts
	yarn test:main test/ymax0 -m beneficiary-wallet || \
	(make ADDR=$(TRADER1ag) fund-wallet && \
	./scripts/ymax-tool.ts 0.1 --exit-success)


agoricNames.chain:
	yarn test:main test/ymax0 -m chain-info || \
	./scripts/deploy-cli.ts ../packages/portfolio-deploy/src/chain-info.build.js \
		  net=local peer=noble:connection-0:channel-0:uusdc

##
# Using ymax
open-with-usdn: deploy-ymax usdc-available ./scripts/ymax-tool.ts
	./scripts/ymax-tool.ts 1.01

usdc-available: ./scripts/noble-usdn-lab.ts
	yarn test:main test/ymax0 -m usdc-available || \
	(FAUCET=trader1 NET=starship ./scripts/noble-usdn-lab.ts && \
	TXFR=9950000 NET=starship ./scripts/noble-usdn-lab.ts)
