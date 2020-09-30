# Validator Upgrade Guide

This file contains hints for how to upgrade your validator from prior versions.

## Upgrading from 2.8.0

* The format of `$HOME/.ag-chain-cosmos/config/app.toml` has changed.  When you are about to start your validator for the new testnet, do the following to upgrade:
```sh
# Remove the old app.toml
rm ~/.ag-chain-cosmos/config/app.toml
# Initialize the new chain
ag-chain-cosmos --overwrite init <moniker>
```
