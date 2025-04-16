#!/bin/bash

DENOM="${DENOM:=uusdc}"
CHAIN_BIN="${CHAIN_BIN:=nobled}"
CHAIN_DIR="${CHAIN_DIR:=$HOME/.nobled}"

set -eux

ls $CHAIN_DIR/config

echo "Update genesis.json file with updated local params"

# Get genesis account to use as primary owner
GENESIS_ADDR=$(jq -r '.app_state.auth.accounts[0].address' $CHAIN_DIR/config/genesis.json)
if [ -z "$GENESIS_ADDR" ]; then
    echo "ERROR: No genesis account found"
    exit 1
fi

# Get FiatTokenFactory role addresses
FIATTF_OWNER_ADDR=$($CHAIN_BIN keys show -a fiattf_owner --keyring-backend="test")
FIATTF_MASTER_MINTER_ADDR=$($CHAIN_BIN keys show -a fiattf_master_minter --keyring-backend="test")
FIATTF_MINTER_CONTROLLER_ADDR=$($CHAIN_BIN keys show -a fiattf_minter_controller --keyring-backend="test")
FIATTF_MINTER_CONTROLLER2_ADDR=$($CHAIN_BIN keys show -a fiattf_minter_controller2 --keyring-backend="test")
FIATTF_MINTER_ADDR=$($CHAIN_BIN keys show -a fiattf_minter --keyring-backend="test")
FIATTF_BLACKLISTER_ADDR=$($CHAIN_BIN keys show -a fiattf_blacklister --keyring-backend="test")
FIATTF_PAUSER_ADDR=$($CHAIN_BIN keys show -a fiattf_pauser --keyring-backend="test")

# Get TokenFactory role addresses
TF_OWNER_ADDR=$($CHAIN_BIN keys show -a tf_owner --keyring-backend="test")
TF_MASTER_MINTER_ADDR=$($CHAIN_BIN keys show -a tf_master_minter --keyring-backend="test")
TF_MINTER_CONTROLLER_ADDR=$($CHAIN_BIN keys show -a tf_minter_controller --keyring-backend="test")
TF_MINTER_CONTROLLER2_ADDR=$($CHAIN_BIN keys show -a tf_minter_controller2 --keyring-backend="test")
TF_MINTER_ADDR=$($CHAIN_BIN keys show -a tf_minter --keyring-backend="test")
TF_BLACKLISTER_ADDR=$($CHAIN_BIN keys show -a tf_blacklister --keyring-backend="test")
TF_PAUSER_ADDR=$($CHAIN_BIN keys show -a tf_pauser --keyring-backend="test")

echo "Configure fiat-tokenfactory module..."
jq --arg owner "$FIATTF_OWNER_ADDR" \
   --arg master_minter "$FIATTF_MASTER_MINTER_ADDR" \
   --arg minter_controller "$FIATTF_MINTER_CONTROLLER_ADDR" \
   --arg minter_controller2 "$FIATTF_MINTER_CONTROLLER2_ADDR" \
   --arg minter "$FIATTF_MINTER_ADDR" \
   --arg blacklister "$FIATTF_BLACKLISTER_ADDR" \
   --arg pauser "$FIATTF_PAUSER_ADDR" \
   --arg denom "$DENOM" \
   '.app_state."fiat-tokenfactory" = {
    "mintingDenom": {
        "denom": $denom
    },
    "paused": {
        "paused": false
    },
    "blacklistedList": [],
    "blacklister": {
        "address": $blacklister
    },
    "masterMinter": {
        "address": $master_minter
    },
    "minterControllerList": [
        {
            "minter": $minter,
            "controller": $minter_controller
        },
        {
            "minter": $minter,
            "controller": $minter_controller2
        }
    ],
    "mintersList": [
        {
            "address": $minter,
            "allowance": {
                "denom": $denom,
                "amount": "100000000000000"
            }
        }
    ],
    "owner": {
        "address": $owner
    },
    "pauser": {
        "address": $pauser
    },
    "params": {}
}' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

echo "Configure tokenfactory module..."
jq --arg owner "$TF_OWNER_ADDR" \
   --arg master_minter "$TF_MASTER_MINTER_ADDR" \
   --arg minter_controller "$TF_MINTER_CONTROLLER_ADDR" \
   --arg minter_controller2 "$TF_MINTER_CONTROLLER2_ADDR" \
   --arg minter "$TF_MINTER_ADDR" \
   --arg blacklister "$TF_BLACKLISTER_ADDR" \
   --arg pauser "$TF_PAUSER_ADDR" \
   '.app_state.tokenfactory = {
    "mintingDenom": {
        "denom": "ufrienzies"
    },
    "paused": {
        "paused": false
    },
    "blacklistedList": [],
    "blacklister": {
        "address": $blacklister
    },
    "masterMinter": {
        "address": $master_minter
    },
    "minterControllerList": [
        {
            "minter": $minter,
            "controller": $minter_controller
        },
        {
            "minter": $minter,
            "controller": $minter_controller2
        }
    ],
    "mintersList": [
        {
            "address": $minter,
            "allowance": {
                "denom": "ufrienzies",
                "amount": "100000000000000"
            }
        }
    ],
    "owner": {
        "address": $owner
    },
    "pauser": {
        "address": $pauser
    },
    "params": {}
}' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# Add denomination metadata
echo "Add denomination metadata..."
USDC_METADATA='{
  "base": "uusdc",
  "display": "usdc",
  "name": "usdc",
  "symbol": "USDC",
  "denom_units": [
    {
      "denom": "uusdc",
      "aliases": ["microusdc"],
      "exponent": "0"
    },
    {
      "denom": "usdc",
      "exponent": "6"
    }
  ]
}'

FRNZ_METADATA='{
  "base": "ufrienzies",
  "display": "ufrienzies",
  "name": "frienzies",
  "symbol": "FRNZ",
  "denom_units": [
    {
      "denom": "ufrienzies",
      "aliases": ["microfrienzies"],
      "exponent": "0"
    },
    {
      "denom": "mfrienzies",
      "aliases": ["millifrienzies"],
      "exponent": "3"
    },
    {
      "denom": "frienzies",
      "exponent": "6"
    }
  ]
}'

jq --argjson usdc "$USDC_METADATA" --argjson frnz "$FRNZ_METADATA" \
  '.app_state.bank.denom_metadata += [$usdc, $frnz]' \
  $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# Configure parameter authority
echo "Configure parameter authority..."
jq --arg addr "$GENESIS_ADDR" '
  .app_state.params.params.authority = $addr |
  .app_state.upgrade.params.authority = $addr
' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# Configure CCTP module
echo "Configure CCTP module..."
jq --arg addr "$GENESIS_ADDR" '.app_state.cctp = {
    "owner": $addr,
    "attester_manager": $addr,
    "pauser": $addr,
    "token_controller": $addr,
    "attester_list": [],
    "per_message_burn_limit_list": [
        {
            "amount": "99999999",
            "denom": "uusdc"
        }
    ],
    "burning_and_minting_paused": {
        "paused": false
    },
    "sending_and_receiving_messages_paused": {
        "paused": false
    },
    "max_message_body_size": {
        "amount": "8000"
    },
    "next_available_nonce": {
        "nonce": "0"
    },
    "signature_threshold": {
        "amount": "2"
    },
    "token_pair_list": [],
    "used_nonces_list": [],
    "token_messenger_list": []
}' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# Configure tariff module
echo "Configure tariff module..."
jq --arg addr "$GENESIS_ADDR" '.app_state.tariff.params = {
    "share": "0.8",
    "distribution_entities": [
        {
            "address": $addr,
            "share": "1.0"
        }
    ],
    "transfer_fee_bps": "0",
    "transfer_fee_max": "0",
    "transfer_fee_denom": "uusdc"
}' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

sed -i -e "s/\"stake\"/\"$DENOM\"/g" $CHAIN_DIR/config/genesis.json
sed -i "s/\"time_iota_ms\": \".*\"/\"time_iota_ms\": \"$TIME_IOTA_MS\"/" $CHAIN_DIR/config/genesis.json

echo "Update max gas param"
jq -r '.consensus_params.block.max_gas |= "100000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

echo "Update staking unbonding time and slashing jail time"
jq -r '.app_state.staking.params.unbonding_time |= "300s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.slashing.params.downtime_jail_duration |= "60s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# overrides for older sdk versions, before 0.47
function gov_overrides_sdk_v46() {
  jq -r '.app_state.gov.deposit_params.max_deposit_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.deposit_params.min_deposit[0].amount |= "10"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.voting_params.voting_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.quorum |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.veto_threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
}

# overrides for newer sdk versions, post 0.47
function gov_overrides_sdk_v47() {
  jq -r '.app_state.gov.params.max_deposit_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.min_deposit[0].amount |= "10"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.voting_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.quorum |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.veto_threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json; mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
}

if [ "$(jq -r '.app_state.gov.params' $CHAIN_DIR/config/genesis.json)" == "null" ]; then
  gov_overrides_sdk_v46
else
  gov_overrides_sdk_v47
fi

$CHAIN_BIN tendermint show-node-id
