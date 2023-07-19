#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

set -euo pipefail
# set -x

here='upgrade-test-scripts/agoric-upgrade-11'

# yarn bundle-source --cache-json /tmp packages/inter-protocol/src/vaultFactory/vaultFactory.js vaultFactory
yarn bundle-source --cache-json /tmp packages/inter-protocol/src/auction/auctioneer.js auctioneer

# TODO: make sure this consistently works
agd tx swingset install-bundle @/tmp/bundle-vaultFactory.json \
      --from gov1 --keyring-backend=test --gas=auto \
      --chain-id=agoriclocal -b block --yes
agoric follow -lF :bundles

agd tx swingset install-bundle @/tmp/bundle-auctioneer.json \
      --from gov1 --keyring-backend=test --gas=auto \
      --chain-id=agoriclocal -b block --yes
agoric follow -lF :bundles

agd --chain-id=agoriclocal \
  tx gov submit-proposal swingset-core-eval \
  ${here}/gov-switch-auctioneer-permit.json ${here}/gov-switch-auctioneer.js \
  --title="Auctioneer Upgrade" --description="auctioneer upgrade test" \
  --deposit=10000000ubld \
  --gas=auto --gas-adjustment=1.2 \
  --yes -o json --from=validator --keyring-backend=test -b block

agd --chain-id=agoriclocal query gov proposals --output json | \
        jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]';

voteLatestProposalAndWait

# then tes some stuff???
# 3129800000uist