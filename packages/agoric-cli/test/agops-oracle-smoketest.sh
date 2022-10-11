#!/bin/sh

if [ -z "$AGORIC_NET" ]; then
    echo "AGORIC_NET env not set"
    echo
    echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
    echo
    echo "To test locally, AGORIC_NET=local and have the following running:
packages/smart-wallet/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY
"
    exit 1
fi

WALLET=$1

if [ -z "$WALLET" ]; then
    echo "USAGE: $0 key"
    echo "You can reference by name: agd keys list"
    exit 1
fi
set -x

# Accept invitation to admin an oracle
ORACLE_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle accept >|"$ORACLE_OFFER"
jq ".body | fromjson" <"$ORACLE_OFFER"
agoric wallet send --from "$WALLET" --offer "$ORACLE_OFFER"
# verify the offerId is readable from chain history
agoric wallet show --from "$WALLET"
ORACLE_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$ORACLE_OFFER")

### Now we have the continuing invitationMakers saved in the wallet

# Use invitation result, with continuing invitationMakers to propose a vote
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPrice --price 1.01 --oracleAdminAcceptOfferId "$ORACLE_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --from "$WALLET" --offer "$PROPOSAL_OFFER"

# verify that the offer was satisfied
echo "Offer $ORACLE_OFFER_ID should have numWantsSatisfied: 1"
agoric wallet show --from "$WALLET"
