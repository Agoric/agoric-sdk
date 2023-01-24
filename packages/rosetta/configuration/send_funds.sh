#!/bin/sh

set -e

#
# Usage:
# ./send_fund.sh <destination>
#

DESTINATION=$1
SOURCE=$(agd --home t1/bootstrap keys show bootstrap -a --keyring-backend=test)

echo "Funding $DESTINATION with 10 BLD and 10 IST"

# Manually build a Send of both BLD and IST
cat > "UNSIGNED_$DESTINATION.json" << EOF
{"body":{
"messages":[
  {"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"${SOURCE}","to_address":"$DESTINATION","amount":[{"denom":"ubld","amount":"10000000"}]},
  {"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"${SOURCE}","to_address":"$DESTINATION","amount":[{"denom":"uist","amount":"10000000"}]}
],"memo":"","timeout_height":"0","extension_options":[],"non_critical_extension_options":[]
},
"auth_info":{"signer_infos":[],"fee":{"amount":[{"denom":"ubld","amount":"2500"}],"gas_limit":"250000","payer":"","granter":""}},
"signatures":[]
}
EOF

# Sign it
agd --home t1/bootstrap tx sign "UNSIGNED_$DESTINATION.json" --from bootstrap --output-document "SIGNED_$DESTINATION.json" --chain-id="agoriclocal" --node tcp://agoric:26657 --yes --keyring-backend=test
rm "UNSIGNED_$DESTINATION.json"

# Broadcast it
agd --home t1/bootstrap tx broadcast "SIGNED_$DESTINATION.json" --from bootstrap --chain-id="agoriclocal" --node tcp://agoric:26657 --yes --keyring-backend=test
rm "SIGNED_$DESTINATION.json"
