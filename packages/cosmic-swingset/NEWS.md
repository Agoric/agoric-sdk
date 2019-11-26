User-visible changes in Cosmic SwingSet:

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
  - `import { E } from '@agoric/eventual-send'` to write smart contracts that
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
