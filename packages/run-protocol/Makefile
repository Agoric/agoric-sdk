TITLE = Start RUN Protocol Preview

EVAL_DEPOSIT = 1000000ubld
GAS_ADJUSTMENT = 1.2

# stage
AG_SOLO_BASEDIR = /tmp/agoricdev10
NETWORK_CONFIG = https://devnet.agoric.net/network-config
CHAIN_ID = $(shell curl -Ss "$(NETWORK_CONFIG)" | jq -r .chainName)
RPC_IP = $(shell curl -Ss "$(NETWORK_CONFIG)" | jq -r .rpcAddrs[0] | cut -d":" -f1)
CHAIN_OPTS = --node=http://$(RPC_IP):26657 --chain-id=$(CHAIN_ID)

# local-chain
# AG_SOLO_BASEDIR=../cosmic-swingset/t1/8000
# CHAIN_ID = agoric
# CHAIN_OPTS = --chain-id=$(CHAIN_ID)

# pairs of permit, code
EVALS = gov-econ-committee-permit.json gov-econ-committee.js \
  gov-amm-vaults-etc-permit.json gov-amm-vaults-etc.js \
  ./scripts/gov-startPSM-permit.json ./scripts/gov-startPSM.js \
  gov-price-feed-permit.json gov-price-feed.js \

submit-proposal: $(EVALS)
	git describe --tags --always
	agd $(CHAIN_OPTS) \
	  --home=$(AG_SOLO_BASEDIR)/ag-cosmos-helper-statedir --keyring-backend=test \
	  tx gov submit-proposal swingset-core-eval \
	  $(EVALS) \
	  --title="$(TITLE) on $(CHAIN_ID)" --description="$$(cat ./docs/run-protocol-preview.md)" \
	  --deposit=$(EVAL_DEPOSIT) \
	  --gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
	  --yes --from=ag-solo -b block


gov-q:
	agd $(CHAIN_OPTS) query gov proposals --output json | \
		jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]';

ADDR=agoric14s56vwftwx8p5kz23fercqptnwex5uw2yj903l

bank-q:
	agd $(CHAIN_OPTS) query bank balances $(ADDR)

# discoverable with: agd query staking validators
VAL_ADDR=agoricvaloper1m74eeyl6fffh79y504yks88k6r5q8kj98l8ejc

val-q:
	agd $(CHAIN_OPTS) query staking validators

tx-stake:
	agoric cosmos $(CHAIN_OPTS) \
	  --from ag-solo --home=$(AG_SOLO_BASEDIR)/ag-cosmos-helper-statedir --keyring-backend=test \
	  tx staking delegate \
	  $(VAL_ADDR) 12000000ubld \
	--yes --gas auto --gas-adjustment=$(GAS_ADJUSTMENT) -b block
