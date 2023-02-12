#!/bin/sh

if [ -z "$AGORIC_NET" ]; then
    echo "AGORIC_NET env not set"
    echo
    echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
    echo
    echo "To test locally, AGORIC_NET=local and have the following running:
# your key in governance
sed -i '' s/agoric1ersatz/\"$KEY\" packages/vats/decentral-psm-config.json

# local chain running with wallet provisioned
packages/smart-wallet/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY
"
    exit 1
fi

KEY=$1

if [ -z "$KEY" ]; then
    echo "USAGE: $0 key"
    echo "You can reference by name: agd keys list"
    echo "Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/"
    echo "and that it's the sole member of economicCommitteeAddresses in decentral-psm-config.json"
    exit 1
fi

set -x

# NB: fee percentages must be at least the governed param values

# Accept invitation to economic committee
COMMITTEE_OFFER=$(mktemp -t agops.XXX)
bin/agops psm committee >|"$COMMITTEE_OFFER"
jq ".body | fromjson" <"$COMMITTEE_OFFER"
agoric wallet send --from "$KEY" --offer "$COMMITTEE_OFFER"
# verify the offerId is readable from chain history
agoric wallet show --from "$KEY"
COMMITTEE_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$COMMITTEE_OFFER")

# Accept invitation to be a charter member
CHARTER_OFFER=$(mktemp -t agops.XXX)
bin/agops psm charter >|"$CHARTER_OFFER"
jq ".body | fromjson" <"$CHARTER_OFFER"
agoric wallet send --from "$KEY" --offer "$CHARTER_OFFER"
# verify the offerId is readable from chain history
agoric wallet show --from "$KEY"
CHARTER_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$CHARTER_OFFER")

### Now we have the continuing invitationMakers saved in the wallet

# Use invitation result, with continuing invitationMakers to propose a vote
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops psm proposePauseOffers --substring wantMinted --psmCharterAcceptOfferId "$CHARTER_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --from "$KEY" --offer "$PROPOSAL_OFFER"

# vote on the question that was made
VOTE_OFFER=$(mktemp -t agops.XXX)
bin/agops psm vote --forPosition 0 --econCommAcceptOfferId "$COMMITTEE_OFFER_ID" >|"$VOTE_OFFER"
jq ".body | fromjson" <"$VOTE_OFFER"
agoric wallet send --from "$KEY" --offer "$VOTE_OFFER"
## wait for the election to be resolved (1m in commands/psm.js)

# check that the dictatorial vote was executed
# TODO use vote outcome data https://github.com/Agoric/agoric-sdk/pull/6204/
SWAP_OFFER=$(mktemp -t agops.XXX)
bin/agops psm swap --wantMinted 0.01 --feePct 0.01 >|"$SWAP_OFFER"
agoric wallet send --from "$KEY" --offer "$SWAP_OFFER"

# chain logs should read like:
# vat: v15: walletFactory: { wallet: Object [Alleged: SmartWallet self] {}, actionCapData: { body: '{"method":"executeOffer","offer":{"id":1663182246304,"invitationSpec":{"source":"contract","instance":{"@qclass":"slot","index":0},"publicInvitationMaker":"makeWantMintedInvitation"},"proposal":{"give":{"In":{"brand":{"@qclass":"slot","index":1},"value":{"@qclass":"bigint","digits":"10002"}}},"want":{"Out":{"brand":{"@qclass":"slot","index":2},"value":{"@qclass":"bigint","digits":"10000"}}}}}}', slots: [ 'board04312', 'board0223', 'board0639' ] } }
# vat: v15: wallet agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf starting executeOffer 1663182246304
# vat: v14: bank balance update { address: 'agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf', amount: '1121979996', denom: 'ibc/usdc1234' }
#  ls: v6: Logging sent error stack (Error#1)
#  ls: v6: Error#1: not accepting offer with description wantMinted
#  ls: v6: Error: not accepting offer with description "wantMinted"

# Propose a vote to raise the mint limit
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops psm proposeChangeMintLimit --limit 10000 --psmCharterAcceptOfferId "$CHARTER_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --from "$KEY" --offer "$PROPOSAL_OFFER"

# to verify that the question was proposed, you can use
# agoric follow published.committees.Economic_Committee.latestQuestion
# for a local net or
# agoric -B $networkConfig follow published.committees.Economic_Committee.latestQuestion

# vote on the question that was made
VOTE_OFFER=$(mktemp -t agops.XXX)
bin/agops psm vote --forPosition 0 --econCommAcceptOfferId "$COMMITTEE_OFFER_ID" >|"$VOTE_OFFER"
jq ".body | fromjson" <"$VOTE_OFFER"
agoric wallet send --from "$KEY" --offer "$VOTE_OFFER"
## wait for the election to be resolved (1m default in commands/psm.js)

# to see the new MintLimit
bin/agops psm info
