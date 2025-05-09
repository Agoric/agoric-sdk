#!/bin/bash
set -euo pipefail


# Check required commands
check_command() {
    local cmd=$1
    local pkg=${2:-$1}
    if ! type "$cmd" >/dev/null 2>&1; then
        echo "Error: Required command '$cmd' not found."
        echo "Please install it using one of the following methods:"
        echo "  - macOS with Homebrew: brew install $pkg"
        echo "  - macOS built-in: should be in /usr/bin"
        exit 1
    fi
}

# Define aliases for CLI access
GAIA="kubectl exec -i cosmoshublocal-genesis-0 -- gaiad"
STRIDE="kubectl exec -i stridelocal-genesis-0 -- strided"

# Step 1: Get first account from Gaia and Stride
echo "🔑 Fetching first Gaia account..."
GAIA_SENDER=$($GAIA keys list --keyring-backend test --output json | jq -r '.[0].name')
echo "   → Using Gaia account: $GAIA_SENDER"

echo "🔑 Fetching first Stride account..."
STRIDE_RECIPIENT=$($STRIDE keys list --keyring-backend test --output json | jq -r '.[0].address')
echo "   → Using Stride recipient address: $STRIDE_RECIPIENT"

# Step 2: Determine Gaia → Stride channel
echo "🔎 Detecting Gaia → Stride channel..."
CHANNEL=$(./scripts/find_ibc_channel.sh)
echo "   → Found channel: $CHANNEL"

if [ -z "$CHANNEL" ]; then
  CHANNEL=$($GAIA q ibc channel channels --output json | jq -r '.channels[0].channel_id')
  echo "⚠️ Using fallback channel: $CHANNEL"
else
  echo "   → Found channel: $CHANNEL"
fi

# Step 3: Do the IBC transfer
echo "🚀 Initiating IBC transfer: 1000000uatom from Gaia → Stride..."
CMD="$GAIA tx ibc-transfer transfer transfer $CHANNEL $STRIDE_RECIPIENT 1000000uatom \
  --from $GAIA_SENDER \
  --keyring-backend test \
  --chain-id cosmoshublocal \
  --yes"
echo "+ $CMD"
eval "$CMD"

# Step 4: Wait for denom trace to appear on Stride
echo "⏳ Waiting for denom trace to be established on Stride..."

# output balances of stride recipient
echo $($STRIDE q bank balances "$STRIDE_RECIPIENT" --output json)


ATTEMPTS=15
for i in $(seq 1 $ATTEMPTS); do
  TRACE_JSON=$($STRIDE q ibc-transfer denom-traces --output json)
  COUNT=$(echo "$TRACE_JSON" | jq '.denom_traces | length')

  if [ "$COUNT" -gt 0 ]; then
    echo "✅ Denom trace found!"
    echo "$TRACE_JSON" | jq '.denom_traces'
    BASE_DENOM=$(echo "$TRACE_JSON" | jq -r '.denom_traces[0].base_denom')
    IBC_PATH=$(echo "$TRACE_JSON" | jq -r '.denom_traces[0].path')

    HASH=$(echo -n "$IBC_PATH/$BASE_DENOM" | { /usr/bin/shasum -a 256 2>/dev/null || sha256sum; } | /usr/bin/cut -d ' ' -f1 | /usr/bin/tr a-z A-Z)
    IBC_DENOM="ibc/$HASH"
    echo "💡 IBC denom on Stride: $IBC_DENOM"
    break
  else
    echo "  ⏳ Waiting... ($i/$ATTEMPTS)"
    sleep 2
  fi
done

if [ -z "${IBC_DENOM:-}" ]; then
  echo "❌ IBC denom trace not found after $ATTEMPTS attempts."
  exit 1
fi

# Step 5: Check balance on Stride recipient
echo "💰 Fetching balance for $STRIDE_RECIPIENT on Stride..."
$STRIDE q bank balances "$STRIDE_RECIPIENT" --output json | jq ".balances[] | select(.denom == \"$IBC_DENOM\")"

echo "✅ Done."
