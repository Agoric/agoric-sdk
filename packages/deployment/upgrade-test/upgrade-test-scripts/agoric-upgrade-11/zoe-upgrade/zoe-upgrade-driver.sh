#!/bin/bash

. ./upgrade-test-scripts/env_setup.sh

set -euo pipefail

here='upgrade-test-scripts/agoric-upgrade-11/zoe-upgrade'

agd --chain-id=agoriclocal \
  tx gov submit-proposal swingset-core-eval \
  ${here}/zoe-upgrade-permit.json ${here}/zoe-upgrade-script.js \
  --title="Zoe Upgrade" --description="zoe upgrade test" \
  --deposit=10000000ubld \
  --gas=auto --gas-adjustment=1.2 \
  --yes -o json --from=validator --keyring-backend=test -b block

agd --chain-id=agoriclocal query gov proposals --output json | \
        jq -c '.proposals[] | [.proposal_id,.voting_end_time,.status]';

voteLatestProposalAndWait

# then tes some stuff???
