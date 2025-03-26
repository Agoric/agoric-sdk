#!/bin/bash
set -e

CHAIN_ID="elyslocal"
CHAIN_HOME="/root/.elys"
KEYRING="test"

echo "Reinitializing chain..."

# Clean prior config if needed
rm -rf "$CHAIN_HOME/config/genesis.json"
rm -rf "$CHAIN_HOME/config/priv_validator_key.json"

# Initialize chain with proper chain-id
elysd init mynode --chain-id="$CHAIN_ID" --home "$CHAIN_HOME"

# Add validator key
echo "Creating validator key..."
elysd keys add validator --keyring-backend "$KEYRING" --home "$CHAIN_HOME"
VALIDATOR_ADDRESS=$(elysd keys show validator --keyring-backend "$KEYRING" --home "$CHAIN_HOME" -a)
echo "Validator address: $VALIDATOR_ADDRESS"

# Fund validator account (liquid + staked split)
TOTAL_FUNDS=1000000000000
STAKED_FUNDS=900000000000
LIQUID_FUNDS=$((TOTAL_FUNDS - STAKED_FUNDS))

elysd add-genesis-account "$VALIDATOR_ADDRESS" "${LIQUID_FUNDS}uelys" --keyring-backend "$KEYRING" --home "$CHAIN_HOME"

# Add faucet accounts
FAUCET1="elys1vhdew4wqu3tp8l2d55aqcc73aqvr0rr9ykv6za"
FAUCET2="elys1ezm7znxcdetyj8sadhzmhgma6sn09wnrtcy3dd"

elysd add-genesis-account "$FAUCET1" 4000000000000uelys --home "$CHAIN_HOME" --keyring-backend "$KEYRING"
elysd add-genesis-account "$FAUCET2" 4000000000000uelys --home "$CHAIN_HOME" --keyring-backend "$KEYRING"

# Generate gentx
elysd gentx validator "${STAKED_FUNDS}uelys" \
  --chain-id="$CHAIN_ID" \
  --keyring-backend="$KEYRING" \
  --moniker="local-validator" \
  --home "$CHAIN_HOME"

# Collect gentxs
elysd collect-gentxs --home "$CHAIN_HOME"

# Validate the resulting genesis
elysd validate-genesis --home "$CHAIN_HOME"
