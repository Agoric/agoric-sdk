# see https://github.com/cosmology-tech/starship/blob/0e18757b8393357fc66426c5ee23da4ccf760e74/examples/getting-started/Makefile

NAME = agoric-multichain-testing
FILE = config.yaml

HELM_REPO = starship
HELM_CHART = devnet
HELM_VERSION = v0.2.20

###############################################################################
###                              All commands                               ###
###############################################################################

.PHONY: setup
setup: setup-deps setup-kind

.PHONY: stop
stop: stop-forward delete

.PHONY: clean
clean: stop clean-kind

###############################################################################
###                          Dependency check                               ###
###############################################################################

.PHONY: check
setup-deps:
	$(CURDIR)/scripts/dev-setup.sh

###############################################################################
###                              Helm Charts                                ###
###############################################################################

install:
	$(CURDIR)/scripts/install.sh --config $(FILE) --name $(NAME) --version $(HELM_VERSION)

delete:
	-helm repo remove $(HELM_REPO)
	-helm delete $(NAME)

###############################################################################
###                                 Port forward                            ###
###############################################################################

.PHONY: port-forward
port-forward:
	$(CURDIR)/scripts/port-forward.sh --config=$(FILE)

.PHONY: stop-forward
stop-forward:
	-pkill -f "port-forward"

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
###                           Start All                                     ###
###############################################################################

.PHONY: wait-for-pods
wait-for-pods:
	scripts/pod-readiness.ts

.PHONY: start
start: install wait-for-pods port-forward fund-provision-pool register-bank-assets

# Copy proposal JSON into container
	kubectl cp ./scripts/add_hostzones_proposal.json stridelocal-genesis-0:/tmp/add_hostzones_proposal.json

# Submit the proposal
	kubectl exec -i stridelocal-genesis-0 -- \
		strided tx gov submit-proposal /tmp/add_hostzones_proposal.json \
		--from genesis --chain-id stridelocal --keyring-backend test --gas auto -y

# Extract latest proposal ID (raw, no quotes)
	echo "🔍 Waiting for proposal to be created..."
	kubectl exec -i stridelocal-genesis-0 -- \
		strided q gov proposals --output json | jq -r '.proposals | map(.id | tonumber) | max' > /tmp/last_proposal_id.txt
	echo "📌 Proposal ID: $$(cat /tmp/last_proposal_id.txt)"

	# Wait until voting period has started, and print status on each check
	export PROPOSAL_ID=$$(cat /tmp/last_proposal_id.txt) && \
	echo "⏳ Waiting for proposal $$PROPOSAL_ID to enter voting period..." && \
	while true; do \
		STATUS=$$(kubectl exec -i stridelocal-genesis-0 -- \
			strided q gov proposal $$PROPOSAL_ID --output json 2>/dev/null | jq -r '.status'); \
		echo "  ⏱️  Current status: $$STATUS"; \
		if [ "$$STATUS" = "PROPOSAL_STATUS_VOTING_PERIOD" ]; then \
			echo "✅ Voting period started (status: $$STATUS)"; \
			break; \
		elif [ "$$STATUS" = "PROPOSAL_STATUS_REJECTED" ]; then \
			echo "❌ Proposal $$PROPOSAL_ID was rejected before voting started."; \
			exit 1; \
		fi; \
		sleep 1; \
	done

# Auto-vote YES from all local accounts
	export PROPOSAL_ID=$$(cat /tmp/last_proposal_id.txt) && \
	echo "🗳️ Voting YES on proposal $$PROPOSAL_ID..." && \
	for key in $$(kubectl exec -i stridelocal-genesis-0 -- strided keys list --keyring-backend test --output json | jq -r '.[].name'); do \
		echo "  ✔️ Voting with $$key..."; \
		kubectl exec -i stridelocal-genesis-0 -- \
			strided tx gov vote $$PROPOSAL_ID yes \
			--from $$key --chain-id stridelocal --keyring-backend test --yes > /dev/null; \
	done

# Show final proposal info
	echo "\n📜 Final Proposal Info:"
	export PROPOSAL_ID=$$(cat /tmp/last_proposal_id.txt) && \
	kubectl exec -i stridelocal-genesis-0 -- \
		strided q gov proposal $$PROPOSAL_ID --output json | jq '.'

.PHONY: start
start: install wait-for-pods port-forward fund-provision-pool override-chain-registry register-bank-assets stride-host-zone
