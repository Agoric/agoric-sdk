#!/bin/bash
set -e

# Debug flag for verbose output
DEBUG=${DEBUG:-false}

SOURCE_CHAIN_ID=${SOURCE_CHAIN_ID:-"cosmoshublocal"}
TARGET_CHAIN_ID=${TARGET_CHAIN_ID:-"stridelocal"}
PROPOSAL_FILE="./scripts/add_hostzones_proposal.json"

debug_log() {
    if [ "$DEBUG" = "true" ]; then
        echo "$@"
    fi
}

# Get the connection ID
debug_log "🔍 Finding IBC connection..."
CONNECTION_ID=$(./scripts/find_ibc_connection.sh)
if [ -z "$CONNECTION_ID" ]; then
    echo "❌ Failed to find IBC connection" >&2
    exit 1
fi
debug_log "✅ Found connection: $CONNECTION_ID"

# Get the IBC denom
debug_log "🔍 Calculating IBC denom..."
IBC_DENOM=$(./scripts/find_ibc_denom.sh)
if [ -z "$IBC_DENOM" ]; then
    echo "❌ Failed to calculate IBC denom" >&2
    exit 1
fi
debug_log "✅ Calculated IBC denom: $IBC_DENOM"

# Update the proposal file
debug_log "📝 Updating proposal file..."
TMP_FILE=$(mktemp)

jq --arg conn "$CONNECTION_ID" --arg denom "$IBC_DENOM" \
  '.messages[0].connection_id = $conn | .messages[0].ibc_denom = $denom' \
  "$PROPOSAL_FILE" > "$TMP_FILE"

if [ $? -ne 0 ]; then
    echo "❌ Failed to update proposal file" >&2
    rm -f "$TMP_FILE"
    exit 1
fi

mv "$TMP_FILE" "$PROPOSAL_FILE"

debug_log "✅ Successfully updated proposal file with:"
debug_log "   Connection ID: $CONNECTION_ID"
debug_log "   IBC Denom: $IBC_DENOM"

echo "✅ Proposal file updated successfully"