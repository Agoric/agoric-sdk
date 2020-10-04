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

* The `ag-cosmos-helper` default coin type is now `--coin-type=564`.  If you
  need to recover a key generated before this upgrade from its mnemonic, you
  will need: `ag-cosmos-helper keys add --coin-type=118 --recover`.  If you
  generated the key after this point, you don't need to add a special option to
  recover it.
