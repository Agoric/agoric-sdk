#!/bin/bash

# Propose and carry out Wallet Factory upgrade

set -e

SDK=${SDK:-/usr/src/agoric-sdk}
UP11=${UP11:-$SDK/upgrade-test-scripts/agoric-upgrade-11}
WFUP=${WFUP:-$UP11/wallet-all-ertp}

cd $WFUP

# import voteLatestProposalAndWait
. $UP11/env_setup.sh
. $UP11/../env_setup.sh

TITLE="Add NFT/non-vbank support in WalletFactory"
DESC="Upgrade WalletFactory to support arbitrary ERTP assets such as NFTs"

if [ ! -f ./upgrade-walletFactory-permit.json ]; then
  file ./upgrade-walletFactory-permit.json
  echo run wfup.js proposal builder first
  exit 1
fi

agd tx gov submit-proposal \
  swingset-core-eval ./upgrade-walletFactory-permit.json ./upgrade-walletFactory.js \
    --title="$TITLE" --description="$DESC" \
    --from=validator --keyring-backend=test \
    --deposit=10000000ubld \
    --gas=auto --gas-adjustment=1.2 \
    --chain-id=agoriclocal --yes -b block -o json

agd query gov proposals --output json | \
  jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]';

voteLatestProposalAndWait
