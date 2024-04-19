#!/bin/bash

# Exit when any command fails
set -uxeo pipefail

# Place here any actions that should happen before the upgrade is proposed. The
# actions are executed in the previous chain software, and the effects are
# persisted so they can be used in the steps after the upgrade is complete,
# such as in the "use" or "test" steps, or further proposal layers.

printISTBalance() {
  addr=$(agd keys show -a "$1" --keyring-backend=test)
  agd query bank balances "$addr" -o json \
    | jq -c '.balances[] | select(.denom=="uist")'

}

echo TEST: Offer with bad invitation
printISTBalance gov1

badInvitationOffer=$(mktemp)
cat > "$badInvitationOffer" << 'EOF'
{"body":"#{\"method\":\"executeOffer\",\"offer\":{\"id\":\"bad-invitation-15\",\"invitationSpec\":{\"callPipe\":[[\"badMethodName\"]],\"instancePath\":[\"reserve\"],\"source\":\"agoricContract\"},\"proposal\":{\"give\":{\"Collateral\":{\"brand\":\"$0.Alleged: IST brand\",\"value\":\"+15000\"}}}}}","slots":["board0257"]}
EOF

PATH=/usr/src/agoric-sdk/node_modules/.bin:$PATH
agops perf satisfaction --keyring-backend=test send --executeOffer "$badInvitationOffer" --from gov1 || true

printISTBalance gov1
