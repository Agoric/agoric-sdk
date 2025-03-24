#!/bin/bash
set -e  # Exit on error

DENOM="${DENOM:=uelys}"
COINS="${COINS:=2000000000000uelys}"
CHAIN_ID="${CHAIN_ID:=elyslocal}"
CHAIN_BIN="${CHAIN_BIN:=elysd}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.elys}"
KEYS_CONFIG="${KEYS_CONFIG:=configs/keys.json}"

FAUCET_ENABLED="${FAUCET_ENABLED:=true}"
NUM_VALIDATORS="${NUM_VALIDATORS:=1}"
NUM_RELAYERS="${NUM_RELAYERS:=0}"

echo "Initializing Elys local chain..."

# Initialize the chain
elysd init mynode --chain-id=$CHAIN_ID --home /root/.elys
echo "Chain initialized."


# # Create validator key
echo "Creating validator key..."
elysd keys add validator --keyring-backend test --home /root/.elys
VALIDATOR_ADDRESS=$(elysd keys show validator --keyring-backend test --home /root/.elys -a)
echo "Validator address: $VALIDATOR_ADDRESS"

# Fund validator
echo "Funding validator..."
elysd add-genesis-account "$VALIDATOR_ADDRESS" 2000000000000uelys --home /root/.elys --keyring-backend test


if [[ $FAUCET_ENABLED == "false" && $NUM_RELAYERS -gt "-1" ]];
then
  ## Add relayers keys and delegate tokens
  for i in $(seq 0 $NUM_RELAYERS);
  do
    # Add relayer key and delegate tokens
    RELAYER_KEY_NAME="$(jq -r ".relayers[$i].name" $KEYS_CONFIG)"
    echo "Adding relayer key.... $RELAYER_KEY_NAME"
    jq -r ".relayers[$i].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $RELAYER_KEY_NAME --recover --keyring-backend="test"
    $CHAIN_BIN add-genesis-account $($CHAIN_BIN keys show -a $RELAYER_KEY_NAME --keyring-backend="test") $COINS --keyring-backend="test"
    # Add relayer-cli key and delegate tokens
    RELAYER_CLI_KEY_NAME="$(jq -r ".relayers_cli[$i].name" $KEYS_CONFIG)"
    echo "Adding relayer-cli key.... $RELAYER_CLI_KEY_NAME"
    jq -r ".relayers_cli[$i].mnemonic" $KEYS_CONFIG | $CHAIN_BIN keys add $RELAYER_CLI_KEY_NAME --recover --keyring-backend="test"
    $CHAIN_BIN add-genesis-account $($CHAIN_BIN keys show -a $RELAYER_CLI_KEY_NAME --keyring-backend="test") $COINS --keyring-backend="test"
  done
fi