#!/bin/bash
set -e

# Debug flag - set to true for verbose output
DEBUG=${DEBUG:-false}

SOURCE_CHAIN_ID=${SOURCE_CHAIN_ID:-"cosmoshublocal"}
TARGET_CHAIN_ID=${TARGET_CHAIN_ID:-"stridelocal"}

debug_log() {
    if [ "$DEBUG" = "true" ]; then
        echo "$@"
    fi
}

# Determine command based on chain
get_chain_cmd() {
    local chain=$1
    case $chain in
        "cosmoshublocal")
            echo "gaiad"
            ;;
        "elyslocal")
            echo "elysd"
            ;;
        "stridelocal")
            echo "strided"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

SOURCE_CMD=$(get_chain_cmd "$SOURCE_CHAIN_ID")
if [ "$SOURCE_CMD" = "unknown" ]; then
    echo "❌ Unsupported source chain: $SOURCE_CHAIN_ID" >&2
    exit 1
fi

TARGET_CMD=$(get_chain_cmd "$TARGET_CHAIN_ID")
if [ "$TARGET_CMD" = "unknown" ]; then
    echo "❌ Unsupported target chain: $TARGET_CHAIN_ID" >&2
    exit 1
fi

# Clean g0 function
if ! command -v g0 &> /dev/null; then
  g0() {
    kubectl exec -i --tty=false "${SOURCE_CHAIN_ID}-genesis-0" -- $SOURCE_CMD "$@" 2>/dev/null | sed -n '/^{/,$p'
  }
fi

debug_log "🔍 Searching for IBC connections from $SOURCE_CHAIN_ID to $TARGET_CHAIN_ID..."

# Get all connections
CONNECTIONS_FILE="/tmp/ibc_connections.json"
g0 q ibc connection connections -o json > "$CONNECTIONS_FILE" || {
    echo "❌ Failed to query connections" >&2
    exit 1
}

debug_log "🔎 Checking open connections..."

# Get all clients first to avoid repeated queries
CLIENTS_FILE="/tmp/ibc_clients.json"
g0 q ibc client states -o json > "$CLIENTS_FILE" || {
    echo "❌ Failed to query clients" >&2
    exit 1
}

# Process each connection
while IFS= read -r conn; do
    debug_log "🔗 Checking connection: $conn"
    
    # Get client ID for this connection
    CLIENT_ID=$(jq -r --arg conn "$conn" '.connections[] | select(.id==$conn) | .client_id' "$CONNECTIONS_FILE")
    debug_log "🔧 Connection $conn → client: $CLIENT_ID"
    
    if [ -z "$CLIENT_ID" ]; then
        debug_log "⚠️ Skipping $conn — client ID is empty"
        continue
    fi

    # Get chain ID directly from the cached client states
    CHAIN_ID=$(jq -r --arg client_id "$CLIENT_ID" '.client_states[] | select(.client_id==$client_id) | .client_state.chain_id' "$CLIENTS_FILE")
    debug_log "    ↪ Chain ID from client state: $CHAIN_ID"

    if [ "$CHAIN_ID" = "$TARGET_CHAIN_ID" ]; then
        debug_log "✅ Found matching connection to $TARGET_CHAIN_ID"
        echo "$conn"
        exit 0
    fi
done < <(jq -r '.connections[] | select(.state=="STATE_OPEN") | .id' "$CONNECTIONS_FILE")

echo "❌ No open IBC connection from $SOURCE_CHAIN_ID to $TARGET_CHAIN_ID found." >&2
exit 1