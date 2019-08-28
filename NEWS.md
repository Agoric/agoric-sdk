User-visible changes in Cosmic SwingSet:

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
