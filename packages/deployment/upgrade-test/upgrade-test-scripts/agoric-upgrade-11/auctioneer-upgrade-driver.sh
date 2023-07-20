#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

set -euo pipefail
# set -x

here='upgrade-test-scripts/agoric-upgrade-11'

bundle_auctioneer_filepath='/tmp/bundle-auctioneer.json'
bundle_vault_filepath='/tmp/bundle-vaultFactory.json'

yarn bundle-source --cache-json /tmp packages/inter-protocol/src/vaultFactory/vaultFactory.js vaultFactory
VAULT_HASH=`jq -r .endoZipBase64Sha512 ${bundle_vault_filepath}`

# TODO: print better diagnostic message
echo ${VAULT_HASH}
grep ${VAULT_HASH} ${here}/gov-switch-auctioneer.js || exit 1

yarn bundle-source --cache-json /tmp packages/inter-protocol/src/auction/auctioneer.js auctioneer
AUCTIONEER_HASH=`jq -r .endoZipBase64Sha512 ${bundle_auctioneer_filepath}`
grep ${AUCTIONEER_HASH} ${here}/gov-switch-auctioneer.js || exit 1

# TODO: make sure this consistently works
agd tx swingset install-bundle @${bundle_vault_filepath} \
      --from gov1 --keyring-backend=test --gas=auto \
      --chain-id=agoriclocal -b block --yes
agoric follow -lF :bundles

agd tx swingset install-bundle @${bundle_auctioneer_filepath} \
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