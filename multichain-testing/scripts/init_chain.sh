#!/bin/bash
set -e

echo "Initializing chain..."
elysd init mynode --chain-id=elyslocal --home /root/.elys

echo "Creating validator key..."
elysd keys add validator --keyring-backend test --home /root/.elys
VALIDATOR_ADDRESS=$(elysd keys show validator --keyring-backend test --home /root/.elys -a)
echo "Validator address: $VALIDATOR_ADDRESS"

# Total for validator
TOTAL_FUNDS=1000000000000   # 1 trillion
STAKED_FUNDS=900000000000   # 900 billion
LIQUID_FUNDS=$((TOTAL_FUNDS - STAKED_FUNDS))

# Fund validator with liquid portion
elysd add-genesis-account "$VALIDATOR_ADDRESS" "${LIQUID_FUNDS}uelys" --keyring-backend test --home /root/.elys

# Fund faucet accounts
FAUCET1="elys1vhdew4wqu3tp8l2d55aqcc73aqvr0rr9ykv6za"
FAUCET2="elys1ezm7znxcdetyj8sadhzmhgma6sn09wnrtcy3dd"

elysd add-genesis-account $FAUCET1 4000000000000uelys --keyring-backend test --home /root/.elys
elysd add-genesis-account $FAUCET2 4000000000000uelys --keyring-backend test --home /root/.elys

# Generate gentx to stake
elysd gentx validator "${STAKED_FUNDS}uelys" \
  --chain-id=elyslocal \
  --keyring-backend=test \
  --moniker="local-validator" \
  --home /root/.elys

# Collect gentxs
elysd collect-gentxs --home /root/.elys

# Optional: validate the final genesis
elysd validate-genesis --home /root/.elys
