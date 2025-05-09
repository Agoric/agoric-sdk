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

debug_log "🔍 Searching for IBC transfer channels from $SOURCE_CHAIN_ID to $TARGET_CHAIN_ID..."

# Get all connections and save to file for debugging
CONNECTIONS_FILE="/tmp/ibc_connections.json"
FOUND_CHANNEL="/tmp/found_channel.$$"
rm -f "$FOUND_CHANNEL"

g0 q ibc connection connections -o json > "$CONNECTIONS_FILE" || {
  echo "❌ Failed to query connections" >&2
  exit 1
}

debug_log "🔎 Available open connections:"

# Store connections in an array first
CONNECTIONS=()
while IFS= read -r conn; do
    CONNECTIONS+=("$conn")
done < <(jq -r '.connections[] | select(.state=="STATE_OPEN") | .id' "$CONNECTIONS_FILE")

# Show all connections in debug mode
if [ "$DEBUG" = "true" ]; then
    jq -r '.connections[] | select(.state=="STATE_OPEN")' "$CONNECTIONS_FILE"
fi

# Process each connection from our array
for conn in "${CONNECTIONS[@]}"; do
    debug_log "🔗 Checking connection: $conn"
    
    # Get client ID for this connection
    CLIENT_ID=$(jq -r --arg conn "$conn" '.connections[] | select(.id==$conn) | .client_id' "$CONNECTIONS_FILE")
    debug_log "🔧 Connection $conn → client: $CLIENT_ID"
    
    if [ -z "$CLIENT_ID" ]; then
        debug_log "⚠️ Skipping $conn — client ID is empty"
        continue
    fi

    # Get client state
    CLIENT_STATE=$(g0 q ibc client state "$CLIENT_ID" -o json)
    if [ -z "$CLIENT_STATE" ]; then
        debug_log "⚠️ Could not get client state for $CLIENT_ID"
        continue
    fi

    # Show raw client state for debugging
    if [ "$DEBUG" = "true" ]; then
        debug_log "    ↪ Raw client state:"
        echo "$CLIENT_STATE" | jq '.'
    fi

    # Extract chain ID with multiple fallback paths
    CHAIN_ID=$(echo "$CLIENT_STATE" | jq -r '.client_state.chain_id // .chain_id // .identified_client_state.client_state.chain_id // empty')
    debug_log "    ↪ Chain ID from client state: $CHAIN_ID"

    if [ "$CHAIN_ID" = "$TARGET_CHAIN_ID" ]; then
        debug_log "✅ Found matching connection to $TARGET_CHAIN_ID"
        
        # Look for transfer channels on this connection
        CHANNEL_DATA=$(g0 q ibc channel channels -o json)
        echo "$CHANNEL_DATA" | jq -r --arg conn "$conn" '.channels[] | select(.connection_hops[0]==$conn and .state=="STATE_OPEN" and .port_id=="transfer")' > "$FOUND_CHANNEL"
        
        if [ -s "$FOUND_CHANNEL" ]; then
            if [ "$DEBUG" = "true" ]; then
                debug_log "🎉 Found transfer channel on connection $conn:"
                cat "$FOUND_CHANNEL" | jq '.'
            fi
            CHANNEL_ID=$(cat "$FOUND_CHANNEL" | jq -r '.channel_id')
            echo "$CHANNEL_ID"
            rm -f "$FOUND_CHANNEL"
            exit 0
        fi
        debug_log "⚠️ No transfer channel found on connection $conn"
    fi
done

rm -f "$FOUND_CHANNEL"
echo "❌ No open IBC transfer channel from $SOURCE_CHAIN_ID to $TARGET_CHAIN_ID found." >&2
exit 1
