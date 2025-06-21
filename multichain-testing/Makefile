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
COIN=1000000000uist

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
