#!/bin/bash
set -e  # Exit on error

echo "Initializing Elys local chain..."

# Initialize the chain
elysd init mynode --chain-id=elys-local --home /root/.elys
echo "Chain initialized."


# # Create validator key
echo "Creating validator key..."
elysd keys add validator --keyring-backend test --home /root/.elys
VALIDATOR_ADDRESS=$(elysd keys show validator --keyring-backend test --home /root/.elys -a)
echo "Validator address: $VALIDATOR_ADDRESS"

# Fund validator
echo "Funding validator..."
elysd add-genesis-account "$VALIDATOR_ADDRESS" 2000000000000uelys --home /root/.elys --keyring-backend test
