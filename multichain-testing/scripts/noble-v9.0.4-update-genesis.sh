#!/bin/bash

# This file is replica of scripts/noble-update-genesis but with the added genesisState fix for noble-v9.0.4
# Diff: https://github.com/Agoric/agoric-sdk/compare/test-noble-v9?expand=1#diff-a104780a601d583f772ed0c6319d049ff8bc7e45703b15a9bbb2491306fd0435

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
# nobled query auth module-account cctp | jq '.account.base_account.address'
CCTP_MODULE_ADDR=noble12l2w4ugfz4m6dd73yysz477jszqnfughxvkss5

echo "Configure fiat-tokenfactory module..."
jq --arg owner "$FIATTF_OWNER_ADDR" \
  --arg master_minter "$FIATTF_MASTER_MINTER_ADDR" \
  --arg minter_controller "$FIATTF_MINTER_CONTROLLER_ADDR" \
  --arg minter_controller2 "$FIATTF_MINTER_CONTROLLER2_ADDR" \
  --arg minter "$FIATTF_MINTER_ADDR" \
  --arg blacklister "$FIATTF_BLACKLISTER_ADDR" \
  --arg pauser "$FIATTF_PAUSER_ADDR" \
  --arg denom "$DENOM" \
  --arg cctp_module "$CCTP_MODULE_ADDR" \
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
        },
        {
            "minter": $cctp_module,
            "controller": $minter_controller
        },
        {
            "minter": $cctp_module,
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
        },
        {
            "address": $cctp_module,
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
    }
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
    }
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

echo "Configure owner for authority module…"
jq --arg addr "$GENESIS_ADDR" '
  .app_state.authority = {
    "owner": $addr
  }
' $CHAIN_DIR/config/genesis.json \
  > /tmp/genesis.json && mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

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
            "amount": "9999999999999",
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
    # `token_pair_list` maps remote tokens to local tokens with their respective domains.
    # Currently only configured for Ethereum (domain 0) USDC.
    # The `remote_token` and address fields use base64-encoded bytes of the original address.
    # For a list of supported domains, see: https://developers.circle.com/stablecoins/supported-domains.
    # To support other networks (Solana, Arbitrum, Base, etc.), additional entries must be added
    # with the appropriate domain IDs and token addresses.
    "token_pair_list": [
        {
            "remote_token": "AAAAAAAAAAAAAAAAALCK0ZHGIYs2wdGdSi6esONgbr9I",
            "local_token": "uusdc",
            "remote_domain": 0
        }
    ],
    "used_nonces_list": [],
    # `token_messenger_list` defines the messaging contracts on other domains
    # that can send/receive CCTP messages to/from this chain.
    # Currently only configured for Ethereum (domain 0) TokenMessenger contract.
    # The address is base64-encoded bytes of the TokenMessenger contract address.
    # To support other networks (Solana, Arbitrum, Base, etc.), additional entries must be added
    # See https://developers.circle.com/stablecoins/supported-domains for domain IDs
    "token_messenger_list": [
        {
            "domain_id": 0,
            "address": "AAAAAAAAAAAAAAAAAb36gbaLqSqCE2A4slrexwZq8xU="
        }
    ]
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

. noble-utils.sh
update_genesis "$HOME" "$GENESIS_ADDR"

# ??? sed -i -e "s/\"stake\"/\"$DENOM\"/g" $CHAIN_DIR/config/genesis.json
sed -i "s/\"time_iota_ms\": \".*\"/\"time_iota_ms\": \"$TIME_IOTA_MS\"/" $CHAIN_DIR/config/genesis.json

echo "Update max gas param"
jq -r '.consensus_params.block.max_gas |= "100000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

echo "Update staking unbonding time and slashing jail time"
jq -r '.app_state.staking.params.unbonding_time |= "300s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
jq -r '.app_state.slashing.params.downtime_jail_duration |= "60s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json

# overrides for older sdk versions, before 0.47
function gov_overrides_sdk_v46() {
  jq -r '.app_state.gov.deposit_params.max_deposit_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.deposit_params.min_deposit[0].amount |= "10"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.voting_params.voting_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.quorum |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.tally_params.veto_threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
}

# overrides for newer sdk versions, post 0.47
function gov_overrides_sdk_v47() {
  jq -r '.app_state.gov.params.max_deposit_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.min_deposit[0].amount |= "10"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.voting_period |= "30s"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.quorum |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
  jq -r '.app_state.gov.params.veto_threshold |= "0.000000000000000000"' $CHAIN_DIR/config/genesis.json > /tmp/genesis.json
  mv /tmp/genesis.json $CHAIN_DIR/config/genesis.json
}

if [ "$(jq -r '.app_state.gov.params' $CHAIN_DIR/config/genesis.json)" == "null" ]; then
  gov_overrides_sdk_v46
else
  gov_overrides_sdk_v47
fi

$CHAIN_BIN tendermint show-node-id
