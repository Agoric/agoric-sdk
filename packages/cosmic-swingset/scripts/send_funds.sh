#!/bin/sh

set -ex

#
# Usage:
# ./send_fund.sh <destination> <chain_id> <wallet> <chain_rpc> <keyring_dir>
#

DESTINATION="$1"
CHAIN_ID="$2"
WALLET="$3"
CHAIN_RPC_NODE="$4"
KEYRING_DIR="$5"
SDKROOT="$(cd ../.. > /dev/null && pwd)"
COSMOSBUILD="${SDKROOT}/golang/cosmos/build/"

SOURCE="$("${COSMOSBUILD}/agd" --keyring-dir ${KEYRING_DIR} keys show ${WALLET} -a --keyring-backend=test)"

echo "Funding ${DESTINATION} with 10 BLD and 10 IST"

# Manually build a Send of both BLD and IST
cat > "/tmp/UNSIGNED_${DESTINATION}.json" << EOF
{"body":{
"messages":[
  {"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"${SOURCE}","to_address":"${DESTINATION}","amount":[{"denom":"ubld","amount":"10000000"}]},
  {"@type":"/cosmos.bank.v1beta1.MsgSend","from_address":"${SOURCE}","to_address":"${DESTINATION}","amount":[{"denom":"uist","amount":"10000000"}]}
],"memo":"","timeout_height":"0","extension_options":[],"non_critical_extension_options":[]
},
"auth_info":{"signer_infos":[],"fee":{"amount":[{"denom":"ubld","amount":"2500"}],"gas_limit":"250000","payer":"","granter":""}},
"signatures":[]
}
EOF

# Sign it
"${COSMOSBUILD}/agd" --keyring-dir "${KEYRING_DIR}" tx sign "/tmp/UNSIGNED_${DESTINATION}.json" --from ${WALLET} --output-document "/tmp/SIGNED_${DESTINATION}.json" --chain-id="${CHAIN_ID}" --node "${CHAIN_RPC_NODE}" --yes --keyring-backend=test
rm "/tmp/UNSIGNED_${DESTINATION}.json"

# Broadcast it
"${COSMOSBUILD}/agd" --keyring-dir "${KEYRING_DIR}" tx broadcast "/tmp/SIGNED_${DESTINATION}.json" --from ${WALLET} --chain-id="${CHAIN_ID}" --node "${CHAIN_RPC_NODE}" --yes --keyring-backend=test
rm "/tmp/SIGNED_${DESTINATION}.json"
