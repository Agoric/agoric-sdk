#!/bin/bash

# Propose and carry out starting game contract

SDK=${SDK:-/usr/src/agoric-sdk}
UP11=${UP11:-$SDK/upgrade-test-scripts/agoric-upgrade-11}
WFUP=${WFUP:-$UP11/wallet-all-ertp}

cd $WFUP

. $SDK/upgrade-test-scripts/env_setup.sh
. $UP11/env_setup.sh

TITLE="Start Game1 Contract"

DESC="Start Game1 and register well-known Place issuer"

# TODO: fix error recovery (or don't bother with it at all)
[ -f ./start-game1-permit.json ] || (echo run wf-install-bundle.sh first ; exit 1)

agd tx gov submit-proposal \
  swingset-core-eval ./start-game1-permit.json ./start-game1.js \
    --title="$TITLE" --description="$DESC" \
    --from=validator --keyring-backend=test \
    --deposit=10000000ubld \
    --gas=auto --gas-adjustment=1.2 \
    --chain-id=agoriclocal --yes -b block -o json

agd --chain-id=agoriclocal query gov proposals --output json | \
  jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]';

voteLatestProposalAndWait
