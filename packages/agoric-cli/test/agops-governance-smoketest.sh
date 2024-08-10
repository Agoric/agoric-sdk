#!/bin/sh

if [ -z "$AGORIC_NET" ]; then
  echo "AGORIC_NET env not set"
  echo
  echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
  echo
  echo "To test locally, AGORIC_NET=local and have the following running:
# freshen sdk
yarn install && yarn build

# local chain running with wallet provisioned
packages/agoric-cli/test/start-local-chain.sh
"
  exit 1
fi

set -x

# NB: fee percentages must be at least the governed param values

# Accept invitation to economic committee
bin/agops ec committee --send-from gov1

# Accept invitation to be a charter member
bin/agops ec charter --send-from gov1

### Now we have the continuing invitationMakers saved in the wallet

# Use invitation result, with continuing invitationMakers to propose a vote
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops psm proposePauseOffers --substring wantMinted --charterAcceptOfferId "$CHARTER_OFFER_ID" >| "$PROPOSAL_OFFER"
agoric wallet print --file "$PROPOSAL_OFFER"
agoric wallet send --offer "$PROPOSAL_OFFER" --from gov1 --keyring-backend="test"

# vote on the question that was made
bin/agops ec vote --forPosition 0 --send-from gov1 --keyring-backend="test" "$COMMITTEE_OFFER_ID"
## wait for the election to be resolved (1m in commands/psm.js)

# FIXME this one failing with: Error: cannot grab 10002ibc/toyellie coins: 0ibc/toyellie is smaller than 10002ibc/toyellie: insufficient funds
# check that the dictatorial vote was executed
# TODO use vote outcome data https://github.com/Agoric/agoric-sdk/pull/6204/
SWAP_OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 >| "$SWAP_OFFER"
agoric wallet send --offer "$SWAP_OFFER" --from gov1 --keyring-backend="test"

# chain logs should read like:
# vat: v15: walletFactory: { wallet: Object [Alleged: SmartWallet self] {}, actionCapData: { body: '{"method":"executeOffer","offer":{"id":1663182246304,"invitationSpec":{"source":"contract","instance":{"@qclass":"slot","index":0},"publicInvitationMaker":"makeWantMintedInvitation"},"proposal":{"give":{"In":{"brand":{"@qclass":"slot","index":1},"value":{"@qclass":"bigint","digits":"10002"}}},"want":{"Out":{"brand":{"@qclass":"slot","index":2},"value":{"@qclass":"bigint","digits":"10000"}}}}}}', slots: [ 'board04312', 'board0223', 'board0639' ] } }
# vat: v15: wallet agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf starting executeOffer 1663182246304
# vat: v14: bank balance update { address: 'agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf', amount: '1121979996', denom: 'ibc/toyusdc' }
#  ls: v6: Logging sent error stack (Error#1)
#  ls: v6: Error#1: not accepting offer with description wantMinted
#  ls: v6: Error: not accepting offer with description "wantMinted"

# Propose a vote to raise the mint limit
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops psm proposeChangeMintLimit --limit 10000 --previousOfferId "$CHARTER_OFFER_ID" >| "$PROPOSAL_OFFER"
agoric wallet print --file "$PROPOSAL_OFFER"
agoric wallet send --offer "$PROPOSAL_OFFER" --from gov1 --keyring-backend="test"

# to verify that the question was proposed, you can use
# agoric follow published.committees.Economic_Committee.latestQuestion
# for a local net or
# agoric -B $networkConfig follow published.committees.Economic_Committee.latestQuestion

# vote on the question that was made
bin/agops ec vote --forPosition 0 --send-from gov1 --keyring-backend="test" "$COMMITTEE_OFFER_ID"
## wait for the election to be resolved (1m default in commands/psm.js)

# to see the new MintLimit
bin/agops psm info

# Propose to burn fees
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops reserve proposeBurn --value 1000 --charterAcceptOfferId "$CHARTER_OFFER_ID" >| "$PROPOSAL_OFFER"
agoric wallet print --file "$PROPOSAL_OFFER"
agoric wallet send --offer "$PROPOSAL_OFFER" --from gov1 --keyring-backend="test"

# Vote for the API call
bin/agops ec vote --forPosition 0 --send-from gov1 --keyring-backend="test" "$COMMITTEE_OFFER_ID"
