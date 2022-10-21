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

KEY=$1

if [ -z "$KEY" ]; then
    echo "USAGE: $0 key"
    echo "You can reference by name: agd keys list"
    echo "Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/"
    echo "and that it's the sole member of economicCommitteeAddresses in decentral-psm-config.json"
    exit 1
fi

set -x

# TODO initOracle with a distribution to $WALLET
# ~use simpleCreatePriceFeed with a CORE_EVAL~ also needs the installation

# Run a solo with `scenario2-setup` (creates chain config and a solo config)

# Run scenario2-runclient (make an agsolo and gives it all the powers, which is what you need to do the Oracle init-core script)

# Then run `agoric deploy dapp-oracle/api/scripts/init-core.js

# Need to specify ORACLE_ADDRESS
# Provision the smart wallet with the Makefile rules
# (SMART_WALLET and not REMOTE_WALLET)

# Then there should be a home.priceAuthority that I can,
# 1) query the price
# 2) use the smart wallet cI to update it
# 3) check that the price moved (or the update went through in the offer status)

# Accept invitation to admin an oracle
ORACLE_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle accept >|"$ORACLE_OFFER"
jq ".body | fromjson" <"$ORACLE_OFFER"
agoric wallet send --from "$KEY" --offer "$ORACLE_OFFER"
# verify the offerId is readable from chain history
agoric wallet show --from "$KEY"
ORACLE_OFFER_ID=$(jq ".body | fromjson | .offer.id" <"$ORACLE_OFFER")

### Now we have the continuing invitationMakers saved in the wallet

# Use invitation result, with continuing invitationMakers to propose a vote
PROPOSAL_OFFER=$(mktemp -t agops.XXX)
bin/agops oracle pushPrice --price 1.01 --oracleAdminAcceptOfferId "$ORACLE_OFFER_ID" >|"$PROPOSAL_OFFER"
jq ".body | fromjson" <"$PROPOSAL_OFFER"
agoric wallet send --from "$KEY" --offer "$PROPOSAL_OFFER"

# FIXME
# chain logs should read like:
# vat: v15: walletFactory: { wallet: Object [Alleged: SmartWallet self] {}, actionCapData: { body: '{"method":"executeOffer","offer":{"id":1663182246304,"invitationSpec":{"source":"contract","instance":{"@qclass":"slot","index":0},"publicInvitationMaker":"makeWantMintedInvitation"},"proposal":{"give":{"In":{"brand":{"@qclass":"slot","index":1},"value":{"@qclass":"bigint","digits":"10002"}}},"want":{"Out":{"brand":{"@qclass":"slot","index":2},"value":{"@qclass":"bigint","digits":"10000"}}}}}}', slots: [ 'board04312', 'board0223', 'board0639' ] } }
# vat: v15: wallet agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf starting executeOffer 1663182246304
# vat: v14: bank balance update { address: 'agoric109q3uc0xt8aavne94rgd6rfeucavrx924e0ztf', amount: '1121979996', denom: 'ibc/usdc1234' }
#  ls: v6: Logging sent error stack (Error#1)
#  ls: v6: Error#1: not accepting offer with description wantMinted
#  ls: v6: Error: not accepting offer with description "wantMinted"

# TODO
# look at offer status to confirm the price was pushed (we don't publish for each oracle node)
# Wait 30s and confirm the price moved on the aggregator

bin/agops oracle query
