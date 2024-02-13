EVAL_DEPOSIT = 1000000ubld
GAS_ADJUSTMENT = 1.2

# USAGE
# set KEY= on command to your key or modify this file
# edit the EVALS paths to your script
# see what open questions there are
#
# submit proposal
#   make submit-proposal
# see what its question number is
#   make gov-q
# go over to cosmic-swingset and vote for that number
#   make scenario2-vote VOTE_PROPOSAL=2
# poll until the vote concludes to see how it turned out
#   make gov-q


# stage
# NETWORK_CONFIG = https://ollinet.agoric.net/network-config
# CHAIN_ID = $(shell curl -Ss "$(NETWORK_CONFIG)" | jq -r .chainName)
#RPC_IP = $(shell curl -Ss "$(NETWORK_CONFIG)" | jq -r .rpcAddrs[0] | cut -d":" -f1)
NODE = $(shell curl -Ss "$(NETWORK_CONFIG)" | jq -r .rpcAddrs[0])

# running local
CHAIN_ID = agoriclocal
CHAIN_OPTS = --chain-id=$(CHAIN_ID)

# local-chain
# AG_SOLO_BASEDIR=../cosmic-swingset/t1/8000
# CHAIN_ID = agoric
# CHAIN_OPTS = --chain-id=$(CHAIN_ID)

# pairs of permit, code
# EVALS = gov-econ-committee-permit.json gov-econ-committee.js \
#   gov-amm-vaults-etc-permit.json gov-amm-vaults-etc.js \
#   ./scripts/gov-startPSM-permit.json ./scripts/gov-startPSM.js

# TODO parameterize
EVALS = test/psm/wildcard-permit.json test/psm/gov-replace-committee.js
DESCRIPTION = test/psm/gov-replace-committee.md
TITLE = $$(head -1 $(DESCRIPTION))

KEY=k1
# ADDR=agoric1z8vavxgfjztlhay5kftgp4kp5l4znkh4gf8lg4
ADDR=$$(agd keys show $(KEY) --output json |jq --raw-output .address)

submit-proposal: $(EVALS) $(DESCRIPTION)
	agd keys show $(KEY)
	agd $(CHAIN_OPTS) \
	  tx gov submit-proposal swingset-core-eval \
	  $(EVALS) \
	  --title="$(TITLE) on $(CHAIN_ID)" --description="$$(cat $(DESCRIPTION))" \
	  --deposit=$(EVAL_DEPOSIT) \
	  --gas=auto --gas-adjustment=$(GAS_ADJUSTMENT) \
	  --yes --from=$(KEY) -b sync

gov-q:
	agd $(CHAIN_OPTS) query gov proposals --output json | \
		jq -c '.proposals[] | [if .proposal_id == null then .id else .proposal_id end,.voting_end_time,.status]';

bank-q:
	agd $(CHAIN_OPTS) query bank balances $(ADDR)
