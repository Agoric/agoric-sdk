#! /bin/bash
set -ex

# Get the height parameter from the command line argument.
height=${1-0}

addr=$(cat t1/8000/ag-cosmos-helper-address)
hex=$(agd keys parse $addr --output=json | jq -r '.bytes')
b64=$(echo $hex | xxd -r -p | base64 | tr '+/' '-_')
# echo $b64

# Query the bank balance of (potentially) an empty account
server=http://localhost:1317
url="$server/bank/balances/$addr?height=$height"
#url="$server/agoric/swingset/egress/$b64"
#url=$server/agoric/swingset/storage/data/activityhash

# Display the output of a single request:
curl "$url"

# Run the Apache Benchmark:
ab -n 16000 -c 5 "$url"

{
  sleep 1
  : NOTE: This will time out because of rate limiting
} &
# This one hangs (because of rate limiting at around 16350 requests since the
# last one started):
ab -n 3000 -c 5 "$url"
