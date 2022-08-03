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

SCRIPTS_DIR="$(dirname "$(realpath "$0")")"
FLATTENER="$SCRIPTS_DIR/flatten_json_sequence.awk"

# Make the request and extract data from a response that looks like
#   {
#     "jsonrpc": "2.0",
#     "id": -1,
#     "result": {
#       "response": {
#         "code": 0,
#         "log": "",
#         "info": "",
#         "index": "0",
#         "key": null,
#         "value": "<base64-encoded JSON text>",
#         "proofOps": null,
#         "height": "<decimal digits>",
#         "codespace": ""
#       }
#     }
#   }
vars="$(
  curl -sS "${URL_PREFIX%/}/abci_query?path=%22/custom/vstorage/data/$STORAGE_KEY%22" | \
  # Flatten into compact JSON.
  awk -f "$FLATTENER" | \
  # Remove the enclosing braces.
  awk '{ sub(/^[{]/, ""); sub(/[}]$/, ""); print; }' | \
  # Extract block height and value into shell variable assignment format (`name=value`).
  awk -v RS=, -F: '
    BEGIN {
      JSON_TO_VAR["result-response-height"] = "block_height";
      JSON_TO_VAR["result-response-value"] = "value_base64";
    }
    {
      # Ignore the enclosing quotes when checking each member.
      name = JSON_TO_VAR[substr($1, 2, length($1) - 2)];
      if (name) {
        # Constrain the alphabet for values.
        if ($2 ~ /^[[:alnum:]=."_ \-]*$/) {
          printf "%s=%s\n", name, $2;
        }
      }
    }
  '
)"
eval "$vars"

# Decode the value into flat JSON and insert a member for the block height.
printf '%s' "${value_base64:-}" | \
  base64 -d | \
  awk -f "$FLATTENER" -v unwrap=value -v capdata=true | \
  awk -v height="${block_height:-}" '{
    # A following comma is necessary if and only if the object is not empty
    # (i.e., that it is not `{}`).
    separator = ",";
    if (substr($0, 2, 1) == "}") {
      separator = "";
    }
    sub(/^[{]/, sprintf("{\"blockHeight\":\"%s\"%s", height, separator));
    print;
  }'
