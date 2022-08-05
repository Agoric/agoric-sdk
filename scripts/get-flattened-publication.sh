#!/bin/bash
set -ueo pipefail

USAGE="$0 HOST STORAGE_KEY
Returns flat JSON corresponding with chain storage data returned by an RPC node.

  HOST is a URL prefix against which an abci_query HTTP request may be issued,
       e.g. \"https://xnet.rpc.agoric.net/\".
  STORAGE_KEY is a chain storage key name, e.g. \"published.amm.pool0.metrics\".
";

URL_PREFIX="${1:-}";
STORAGE_KEY="${2:-}";

if [ ":${1:-}" = '--help' -o ":$URL_PREFIX" = : -o ":$STORAGE_KEY" = : -o $# -gt 2 ]; then
  printf '%s' "$USAGE"
  exit 64
fi

# Verify jq version.
jq --version | awk '
  /^jq-1[.]([6-9]|[1-9][0-9])/ {
    exit;
  }
  {
    print "jq version out of range (must be >=1.6 <2.0): " $0 > "/dev/stderr";
    exit 1;
  }
'

# Make the abci_query request and extract data from a response.
# cf. https://docs.tendermint.com/master/rpc/#/ABCI/abci_query
#
#   {
#     "jsonrpc": "2.0",
#     "id": <integer>,
#     "result": {
#       "response": {
#         "value": "<base64-encoded JSON text>",
#         "height": "<decimal digits>",
#         ...
#       }
#     }
#   }

# Avoid the GET interface in case interpretation of `path` as JSON is ever fixed.
# https://github.com/tendermint/tendermint/issues/9164
# curl -sS "${URL_PREFIX%/}/abci_query?path=%22/custom/vstorage/data/$STORAGE_KEY%22" | \
curl -sS "$URL_PREFIX" --request POST --header 'Content-Type: application/json' --data "$(
  printf '{
    "jsonrpc": "2.0",
    "id": -1,
    "method": "abci_query",
    "params": { "path": "/custom/vstorage/data/%s" }
  }' "$STORAGE_KEY"
)" | \
# Decode, simplify, flatten, and compact the output.
jq -c '
  # Capture block height.
  .result.response.height? as $height |

  # Decode `value` as base64, then decode that as JSON.
  .result.response.value | @base64d | fromjson |

  # Decode `value` as JSON, capture `slots`, then decode `body` as JSON.
  .value | fromjson | .slots as $slots | .body | fromjson |

  # Add block height.
  (.blockHeight |= $height) |

  # Replace select capdata.
  walk(
    if type=="object" and .["@qclass"]=="bigint" then
      # Replace bigint capdata with the sequence of digits.
      .digits
    elif type=="object" and .["@qclass"]=="slot" then
      # Replace slot reference capdata with {
      #   id: <value from global `slots`>,
      #   allegedName: <extracted from local `iface`>,
      # }.
      {
        id: $slots[.index],
        allegedName: .iface | sub("^Alleged: (?<name>.*) brand$"; "\(.name)"; "m")
      }
    else
      .
    end
  ) |

  # Flatten the resulting structure, joining deep member names with "-".
  [ paths(scalars) as $path | { key: $path | join("-"), value: getpath($path) } ] | from_entries
'
