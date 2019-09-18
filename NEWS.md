User-visible changes in Cosmic SwingSet:

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
