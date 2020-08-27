# Validator Upgrade Guide

This file contains hints for how to upgrade your validator from prior versions.

## Upgrading from 2.6.0

* `ag-cosmos-helper` used to have a default `--home` value of `$HOME/.ag-cosmos-helper`, but now it
  stores its state in `$HOME/.ag-chain-cosmos`.  If you explicitly use `ag-cosmos-helper --home=...` you should not need to change anything.
  You can copy any on-disk keys with:
```sh
cp -a ~/.ag-cosmos-helper/keyring* ~/.ag-chain-cosmos/
```
* The format of `$HOME/.ag-chain-cosmos/config/app.toml` has changed.  When you are about to start your validator for the new testnet, do the following to upgrade:
```sh
# Remove the old app.toml
rm ~/.ag-chain-cosmos/config/app.toml
# Initialize the new chain
ag-chain-cosmos --overwrite init <moniker>
```
