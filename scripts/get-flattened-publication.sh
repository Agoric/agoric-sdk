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
  {
    version = $0;
    ok = match(version, /^jq-1[.]([6-9]|[1-9][0-9])/);
    exit;
  }
  END {
    if (!ok) {
      print "jq version out of range (must be >=1.6 <2.0): " version > "/dev/stderr";
      exit 69;
    }
  }
'

# Make the abci_query request.
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
resp="$(
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
  )"
)"

# Decode the response
response_height_json="$(printf '%s' "$resp" | jq '.result.response.height?' | grep -E '^"[0-9]+"$')"
if [ ":$response_height_json" = : ]; then
  printf 'Unable to read response block height:\n%s\n' "$resp" >&2
  exit 1
fi
response_value_json="$(printf '%s' "$resp" | jq '.result.response.value | @base64d | fromjson')"
if [ ":$response_value_json" = : ]; then
  printf 'Unable to read response value as base64-encoded JSON text:\n%s\n' "$resp" >&2
  exit 1
fi
unwrapped_value="$(printf '%s' "$response_value_json" | jq '.value | fromjson')"
if [ ":$unwrapped_value" = : ]; then
  printf 'Unable to unwrap response:\n%s\n' "$response_value_json" >&2
  exit 1
fi

# Simplify, flatten, and compact.
printf '%s' "$unwrapped_value" | jq -c --arg responseHeightJson "$response_height_json" '
  # Upgrade a naked value to a stream cell if necessary.
  if has("blockHeight") and has("values") then . else { values: [ . | tojson ] } end |

  # Capture data block height.
  .blockHeight as $dataHeight |

  # Flatten each value independently.
  .values[] | fromjson |

  # Capture `slots` values.
  .slots as $slotValues |

  # Decode `body` as JSON.
  .body | fromjson |

  # Capture slot names (which generally appear only at first reference).
  (
    [ .. | select(type=="object" and .["@qclass"]=="slot" and (.iface | type=="string")) ] |
    map({ key: .index | tostring, value: .iface }) |
    unique_by(.key) |
    from_entries
  ) as $slotNames |

  # Replace select capdata.
  walk(
    if type=="object" and .["@qclass"]=="bigint" then
      # Replace bigint capdata with the sequence of digits.
      .digits
    elif type=="object" and .["@qclass"]=="slot" then
      # Replace slot reference capdata with {
      #   id: <value from global `slots`>,
      #   allegedName: <extracted from local or previous `iface`>,
      # }.
      {
        id: $slotValues[.index],
        allegedName: (try ((.iface // $slotNames[.index | tostring]) | sub("^Alleged: (?<name>.*) brand$"; "\(.name)"; "m")) catch null)
      }
    else
      .
    end
  ) |

  # Flatten the resulting structure, joining deep member names with "-".
  [ paths(scalars==.) as $path | { key: $path | join("-"), value: getpath($path) } ] | from_entries |

  # Add block height information.
  (.dataBlockHeight |= $dataHeight) |
  (.blockHeight |= ($responseHeightJson | fromjson))
' || {
  status=$?
  printf 'Unable to process response value:\n%s\n' "$unwrapped_value" >&2
  exit $status
}
