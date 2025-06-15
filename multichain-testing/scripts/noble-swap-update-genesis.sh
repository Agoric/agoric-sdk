#!/bin/bash

# -----------------------------------------------------------------------------
# Insert a swap pool into genesis.json for a local Noble v9.0.4 network
# -----------------------------------------------------------------------------
#
# When we started a local Noble node and ran:
#     nobled query swap pools
# we saw nothing — even though we expected a pool.
#
# Unlike some other Cosmos chains (like Osmosis), Noble doesn't create pools
# at runtime by default. If we want a pool to exist at genesis, we need to
# write it directly into genesis.json.
#
# This script:
# - Computes the correct module addresses for the pool and its fee accounts
# - Adds liquidity and bank balances for them
# - Inserts the pool metadata into .app_state.swap and .stableswap_state
# - Updates the bank supply fields
# - Verifies the data is present in genesis.json (no node needs to be running)
#
# The pool account address is derived from the module name "swap/pool/0"
# using Cosmos SDK's module account logic. This is deterministic — no tx needed.
# Similar logic applies to the protocol/reward fee accounts.
#
# For further context, see:
# - Noble Swap Module: https://github.com/noble-assets/swap
# - Pool creation code (source of most logic here):
#     https://github.com/noble-assets/swap/blob/main/keeper/msg_stableswap_server.go
#   → Defines how pool addresses and their fee accounts are derived from module names
#   → Validates things like A values, reward and protocol fee bounds, and multipliers
#   → Sets InitialATime based on block header time at pool creation — not arbitrary!
# - Genesis initialization:
#     https://github.com/noble-assets/swap/blob/main/genesis.go
#   → Confirms the module expects pools to be populated at genesis (if desired)
# - Cosmos SDK Module Accounts:
#     https://docs.cosmos.network/main/modules/auth#module-accounts
# - Osmosis stableswap reference (for contrast):
#     https://github.com/osmosis-labs/osmosis/tree/main/x/gamm


# Set these explicitly for clarity

# Derive a module account address from its label
# Equivalent to sdk.AccAddress(crypto.AddressHash([]byte(name))) in Cosmos SDK
function derive_address() {
  local label="$1"
  local hash=$(echo -n "$label" | sha256sum | awk '{print $1}')
  local hex_address=${hash:0:40}
  nobled debug addr "$hex_address" | grep -o 'noble1[0-9a-z]*'
}
CHAIN_BIN=nobled
CHAIN_DIR=$HOME/.nobled

POOL_ID=0
POOL_PREFIX="swap/pool/${POOL_ID}"
POOL_ADDRESS=$(derive_address "$POOL_PREFIX")
PROTOCOL_FEES_ADDRESS=$(derive_address "${POOL_PREFIX}/protocol_fees")
REWARD_FEES_ADDRESS=$(derive_address "${POOL_PREFIX}/reward_fees")

if [ -z "$POOL_ADDRESS" ] || [ -z "$PROTOCOL_FEES_ADDRESS" ] || [ -z "$REWARD_FEES_ADDRESS" ]; then
  echo "❌ Failed to derive one or more module addresses."
  exit 1
fi

# Initial balances (same for simplicity)
LIQ_USDC=1000000000
LIQ_USDN=1000000000
TOKENS=[$LIQ_USDC,$LIQ_USDN]
DENOMS='["uusdc","uusdn"]'

# Compute dynamic times (must be in the future as of genesis)
NOW=$(date +%s)
INITIAL_A_TIME=$((NOW + 60))
INITIAL_REWARDS_TIME=$(date -u -d "@$((NOW + 60))" +"%Y-%m-%dT%H:%M:%SZ")

jq --arg poolId "$POOL_ID" \
   --arg poolAddress "$POOL_ADDRESS" \
   --arg protocolAddress "$PROTOCOL_FEES_ADDRESS" \
   --arg rewardAddress "$REWARD_FEES_ADDRESS" \
   --argjson liqUSDC "$LIQ_USDC" \
   --argjson liqUSDN "$LIQ_USDN" \
   --argjson tokens "$TOKENS" \
   --argjson denoms "$DENOMS" \
  --argjson initialATime "$INITIAL_A_TIME" \
  --arg initialRewardsTime "$INITIAL_REWARDS_TIME" \
   '
   .app_state.bank.balances += [
     {
       address: $poolAddress,
       coins: [
         { denom: "uusdc", amount: ($liqUSDC|tostring) },
         { denom: "uusdn", amount: ($liqUSDN|tostring) }
       ]
     },
     {
       address: $protocolAddress,
       coins: []
     },
     {
       address: $rewardAddress,
       coins: []
     }
   ]
   |
   .app_state.bank.supply |= (
     map(
       if .denom == "uusdc" then
         .amount = ((.amount|tonumber) + $liqUSDC) | tostring
       elif .denom == "uusdn" then
         .amount = ((.amount|tonumber) + $liqUSDN) | tostring
       else .
       end
     )
   )
   |
   .app_state.swap.pools[$poolId] = {
     address: $poolAddress,
     algorithm: "STABLESWAP",
     pair: "uusdc",
     details: {
       type: "/noble.swap.stableswap.v1.Pool",
       value: {
         protocol_fee_percentage: "50",
         rewards_fee: "2500000",
         initial_a: "800",
         future_a: "800",
         initial_a_time: ($initialATime | tonumber),
         rate_multipliers: [
           { denom: "uusdc", amount: "1000000000000000000" },
           { denom: "uusdn", amount: "1000000000000000000" }
         ],
         total_shares: "10000000000.000000000000000000",
         initial_rewards_time: $initialRewardsTime
       }
     },
     liquidity: [
       { denom: "uusdc", amount: ($liqUSDC|tostring) },
       { denom: "uusdn", amount: ($liqUSDN|tostring) }
     ],
     protocol_fees: [],
     reward_fees: []
   }
   |
   .app_state.swap.stableswap_state.pools[$poolId] = {
     initial_a: "800",
     future_a: "800",
     initial_a_time: "1740153360",
     rate_multipliers: [
       { denom: "uusdc", amount: "1000000000000000000" },
       { denom: "uusdn", amount: "1000000000000000000" }
     ],
     total_shares: "10000000000.000000000000000000",
     initial_rewards_time: "2025-02-21T00:00:00Z"
   }
   ' "$CHAIN_DIR/config/genesis.json" > "$CHAIN_DIR/config/genesis.modified.json" && \
   mv "$CHAIN_DIR/config/genesis.modified.json" "$CHAIN_DIR/config/genesis.json"

echo "✅ Pool $POOL_ID and related module accounts inserted into genesis successfully."

# Validation step
# NOTE: This validation does not query a running node.
# It checks genesis content directly to ensure the pool and balances were inserted.

echo "🔍 Checking genesis.json contains swap pool ID $POOL_ID..."
jq ".app_state.swap.pools[\"$POOL_ID\"]" "$CHAIN_DIR/config/genesis.json" | jq .

echo "🔍 Verifying bank balances for pool address $POOL_ADDRESS..."
jq ".app_state.bank.balances[] | select(.address == \"$POOL_ADDRESS\")" "$CHAIN_DIR/config/genesis.json" | jq .
