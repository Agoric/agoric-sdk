#!/bin/bash

update_genesis() {
  local HOME1=$1
  local AUTHORITY=$2

  local TEMP="$HOME1/genesis.json"
  touch $TEMP && jq '.app_state.authority.owner = '$AUTHORITY'' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.bank.denom_metadata += [{ "description": "Circle USD Coin", "denom_units": [{ "denom": "uusdc", "exponent": 0, "aliases": ["microusdc"] }, { "denom": "usdc", "exponent": 6 }], "base": "uusdc", "display": "usdc", "name": "Circle USD Coin", "symbol": "USDC" }]' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.bank.denom_metadata += [{ "description": "Ondo US Dollar Yield", "denom_units": [{ "denom": "ausdy", "exponent": 0, "aliases": ["attousdy"] }, { "denom": "usdy", "exponent": 18 }], "base": "ausdy", "display": "usdy", "name": "Ondo US Dollar Yield", "symbol": "USDY" }]' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.bank.denom_metadata += [{ "description": "Hashnote US Yield Coin", "denom_units": [{ "denom": "uusyc", "exponent": 0, "aliases": ["microusyc"] }, { "denom": "usyc", "exponent": 6 }], "base": "uusyc", "display": "usyc", "name": "Hashnote US Yield Coin", "symbol": "USYC" }]' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.bank.denom_metadata += [{ "description": "Monerium EUR emoney", "denom_units": [{ "denom": "ueure", "exponent": 0, "aliases": ["microeure"] }, { "denom": "eure", "exponent": 6 }], "base": "ueure", "display": "eure", "name": "Monerium EUR emoney", "symbol": "EURe" }]' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.bank.denom_metadata += [{ "description": "Noble Dollar", "denom_units": [{ "denom": "uusdn", "exponent": 0, "aliases": ["microusdn"] }, { "denom": "usdn", "exponent": 6 }], "base": "uusdn", "display": "usdn", "name": "Noble Dollar", "symbol": "USDN" }]' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state."fiat-tokenfactory".mintingDenom = { "denom": "uusdc" }' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state."fiat-tokenfactory".paused.paused = false' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.staking.params.bond_denom = "ustake"' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.wormhole.config.chain_id = 4009' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.wormhole.config.gov_chain = 1' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.wormhole.config.gov_address = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQ="' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
  touch $TEMP && jq '.app_state.wormhole.guardian_sets = {"0":{"addresses":["vvpCnVfNGLf4pNkaLamrSvBdD74="],"expiration_time":0}}' $HOME1/config/genesis.json > $TEMP && mv $TEMP $HOME1/config/genesis.json
}
