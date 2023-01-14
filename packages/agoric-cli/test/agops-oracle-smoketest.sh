#!/bin/sh

# "agoric follow" steps need to be cancelled manually, so these steps should be
# copy-pasted rather than run as a script for best results.

if [ -z "$AGORIC_NET" ]; then
    echo "AGORIC_NET env not set"
    echo
    echo "e.g. AGORIC_NET=ollinet (or export to save typing it each time)"
    echo
    echo "To test locally, AGORIC_NET=local and have the following running:
# freshen sdk
yarn install && yarn build

# local chain running with wallet provisioned
packages/inter-protocol/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY
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

# this is in economy-template.json in the oracleAddresses list (agoric1dy0yegdsev4xvce3dx7zrz2ad9pesf5svzud6y)
# to use it run `agd keys --keyring-backend=test add oracle2 --interactive` and enter this mnenomic:
# dizzy scale gentle good play scene certain acquire approve alarm retreat recycle inch journey fitness grass minimum learn funny way unlock what buzz upon
WALLET2=oracle2

# Accept invitation to admin an oracle
ORACLE_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle accept >|"$ORACLE_OFFER"
jq ".body | fromjson" <"$ORACLE_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET" --offer "$ORACLE_OFFER"
ORACLE_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$ORACLE_OFFER")

# verify the offerId is readable from chain history
agoric wallet show --keyring-backend="test" --from "$WALLET"

# repeat for oracle2
ORACLE_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle accept >|"$ORACLE_OFFER"
jq ".body | fromjson" <"$ORACLE_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET2" --offer "$ORACLE_OFFER"
ORACLE2_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$ORACLE_OFFER")

### Now we have the continuing invitationMakers saved in the wallets

# Use invitation result, with continuing invitationMakers to propose a vote
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPriceRound --price 101 --roundId 1 --oracleAdminAcceptOfferId "$ORACLE_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET" --offer "$PROPOSAL_OFFER"

# verify that the offer was satisfied
echo "Offer $ORACLE_OFFER_ID should have numWantsSatisfied: 1"
agoric wallet show --keyring-backend="test" --from "$WALLET"

# verify feed publishing
agd query vstorage keys published.priceFeed

# verify that the round started
agoric follow :published.priceFeed.ATOM-USD_price_feed.latestRound

# submit another price in the round from the second oracle
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPriceRound --price 201 --roundId 1 --oracleAdminAcceptOfferId "$ORACLE2_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET2" --offer "$PROPOSAL_OFFER"

# second round, first oracle
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPriceRound --price 1102 --roundId 2 --oracleAdminAcceptOfferId "$ORACLE_OFFER_ID" >|"$PROPOSAL_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET" --offer "$PROPOSAL_OFFER"
# second round, second oracle
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPriceRound --price 1202 --roundId 2 --oracleAdminAcceptOfferId "$ORACLE2_OFFER_ID" >|"$PROPOSAL_OFFER"
agoric wallet send --keyring-backend="test" --from "$WALLET2" --offer "$PROPOSAL_OFFER"

# see new price
agoric follow :published.priceFeed.ATOM-USD_price_feed
