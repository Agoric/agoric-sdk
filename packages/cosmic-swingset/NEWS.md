User-visible changes in Cosmic SwingSet:

## Release 0.24.0 (2020-12-10)

* Upgrade to Cosmos SDK v0.40.0-rc4 (Stargate).

### BREAKING CHANGES

* The default block time (`commit_timeout`) has changed from `"2s"` back to
  `"5s"`, in the interest of ensuring globally-dispersed validators can
  participate without downtime.

## Release 0.21.2 (2020-10-11)

* Upgrade to Cosmos SDK v0.40.0 (Stargate) prerelease branch with local changes
  to temporarily disable "state-sync".

### BREAKING CHANGES

* The format of `$HOME/.ag-chain-cosmos/config/app.toml` has changed.  When you
  are going to reinitialize your validator, do the following to upgrade:
```sh
# Remove the old app.toml
rm ~/.ag-chain-cosmos/config/app.toml
# Initialize the new chain
ag-chain-cosmos init --overwrite <moniker>
```

* The `ag-cosmos-helper` default coin type is now `--coin-type=564`.  If you
  need to recover a key generated before this upgrade from its mnemonic, you
  will need: `ag-cosmos-helper keys add --coin-type=118 --recover <your-key-name>`.  If you
  generated the key after this point, you don't need to add a special option to
  recover it.

## Release v0.14.0 (2020-04-02)

* Beginnings of IBC support, currently just stubbed out.

## Release v0.10.7 (2019-10-23)

* Upgrade to ERTP v0.1.8
  - Zoe contracts updated to use ESM format
  - exit conditions have been added to Zoe
* Create the `home.moolah` purse with balance 1000 to have some currency to trade
* Create `home.registrar` to publish objects

## Release v0.10.6 (2019-10-16)

* Upgrade to SwingSet v0.1.0
  - [security fixes for realms-shim and SES](https://github.com/Agoric/realms-shim/security/advisories/GHSA-7cg8-pq9v-x98q)

## Release v0.10.5 (2019-10-16)

* Implement `ag-solo upload-contract`
  - contracts can be dynamically installed on the running chain
  - upload `lib/ag-solo/contracts` directory on initialization
  - see the [README](lib/ag-solo/contracts/README-contract.md)
* Upgrade to ERTP v0.1.7
  - support bundled modules for `home.contractHost` and pre-alpha `home.zoe`
* Restrict origin to localhost for `ag-solo` WebSocket and `/vat` POST
  so that remote sites cannot manipulate `ag-solo`

## Release v0.10.4 (2019-10-09)

* Upgrade to cosmos-sdk v0.37.1 with override for Tendermint v0.32.5
* Upgrade to SwingSet v0.0.27
  - rewritten state management in preparation for on-disk database
  - fix infinite loop involving async property lookup

## Release v0.10.3 (2019-10-07)

* Fix missing cosmos-sdk supply module initialization

## Release v0.10.2 (2019-10-04)

* Upgrade to ERTP v0.1.5
  - fix problem with missing `E.resolve()` method

## Release v0.10.1 (2019-10-02)

* Upgrade to Tendermint v0.32.5
  - [p2p denial of service fix](https://github.com/tendermint/tendermint/blob/v0.32/CHANGELOG.md#v0325)
* Upgrade to SwingSet v0.0.26
  - [security fixes for realms-shim and SES](https://github.com/Agoric/realms-shim/security/advisories/GHSA-6jg8-7333-554w)
  - allow promise property gets with `targetP~.prop~.method()~.`
    (fixes `TypeError: o[optKey] is not a function`), though currently requires a round trip
  - `import { E } from '@endo/eventual-send'` to write smart contracts that
    use the `E()` proxy maker compatible with both SwingSet and without it
* Don't leave behind a corrupt installation if ag-setup-solo provisioning fails

## Release v0.10.0 (2019-09-26)

* Breaking: change infix bang (**!**) to wavy dot (**~.**)
* Upgrade to SwingSet v0.0.24.
  - new timer device
  - wavy dot
  - better SwingSet vat debugger and stack trace support

## Release v0.9.1 (2019-09-18)

* Upgrade to SwingSet v0.0.22.  This fixes a publically disclosed
  [security vulnerability in realms-shim](https://github.com/Agoric/realms-shim/issues/48),

## Release v0.9.0 (2019-09-11)

* Upgrade to Cosmos SDK v0.37.0

## Release v0.8.8 (2019-09-10)

* Enable promise-pipelining on cross-machine messages
* Upgrade to @agoric/swingset-vat version 0.0.21

## Release v0.8.7 (2019-09-04)

* Raise ag-chain-cosmos file descriptor limit to 2048

## Release v0.8.6 (2019-09-04)

* Enable mutable globals and sloppyGlobals in the gallery demo
  This allows direct assignment to unreferenced global variables
  such as: `myvar = 123` assigning to the global `myvar`
* Upgrade to @agoric/ertp version 0.1.4
* Upgrade to @agoric/swingset-vat version 0.0.20

## Release v0.8.5 (2019-08-28)

* Upgrade to @agoric/ertp version 0.1.3
* Doc fixes
* Ansible playbook `fluentd` to facilitate logging

## Release v0.8.4 (2019-08-21)

* Upgrade to @agoric/ertp version 0.1.2.
* Increase chain message throughput limits.

## Release v0.8.3 (2019-08-16)

* More robust provisioning

## Release v0.8.2 (2019-08-16)

* Upgrade to @agoric/ertp version 0.1.1.
* Replace expression evaluator with a "script" evaluator.
  IIFEs are no longer needed to evaluate statements.
* `ag-setup-solo` no longer overwrites apparently good chain state.
* Indicate `home.LOADING` until the chain bundle is received.
* `docker/ag-solo` and `docker/ag-setup-solo` now accept a
  `HOST_PORT` environment variable to designate what TCP port
  number the resulting solo vat HTTP server should be exposed as.
* Doc fixes.
* Started keeping NEWS.
