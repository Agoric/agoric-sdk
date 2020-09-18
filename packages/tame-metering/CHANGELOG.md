# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.2.6-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.6-dev.1...@agoric/tame-metering@1.2.6-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/tame-metering





## [1.2.6-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.6-dev.0...@agoric/tame-metering@1.2.6-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/tame-metering





## [1.2.6-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.5...@agoric/tame-metering@1.2.6-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/tame-metering





## [1.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.4...@agoric/tame-metering@1.2.5) (2020-09-16)

**Note:** Version bump only for package @agoric/tame-metering





## [1.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.3...@agoric/tame-metering@1.2.4) (2020-08-31)


### Bug Fixes

* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))





## [1.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.2...@agoric/tame-metering@1.2.3) (2020-06-30)


### Bug Fixes

* also tame symbol properties of globally-reachable objects ([09498f4](https://github.com/Agoric/agoric-sdk/commit/09498f40e641843366f065e585c33ccb8efc0588))
* preserve `eval` identity to support direct eval ([d263118](https://github.com/Agoric/agoric-sdk/commit/d263118920b3036abaddb81f6d953acd8829df61))





## [1.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.1...@agoric/tame-metering@1.2.2) (2020-05-17)

**Note:** Version bump only for package @agoric/tame-metering





## [1.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.2.0...@agoric/tame-metering@1.2.1) (2020-05-10)

**Note:** Version bump only for package @agoric/tame-metering





# [1.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.1.2...@agoric/tame-metering@1.2.0) (2020-05-04)


### Bug Fixes

* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* end-to-end dIBC across chains ([151ff3f](https://github.com/Agoric/agoric-sdk/commit/151ff3f9e0c92972aa7a21a6f55c1898db85b820))





## [1.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.1.2-alpha.0...@agoric/tame-metering@1.1.2) (2020-04-13)

**Note:** Version bump only for package @agoric/tame-metering





## [1.1.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.1.1...@agoric/tame-metering@1.1.2-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/tame-metering





## [1.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.1.1-alpha.0...@agoric/tame-metering@1.1.1) (2020-04-02)

**Note:** Version bump only for package @agoric/tame-metering





## [1.1.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/tame-metering@1.1.0...@agoric/tame-metering@1.1.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/tame-metering





# 1.1.0 (2020-03-26)


### Bug Fixes

* **configurableGlobals:** use to wrap all builtins under SES ([53c4549](https://github.com/Agoric/agoric-sdk/commit/53c4549e3c9ba9de30a0fd2077c3f352339493e9))
* **evaluator:** quiescence works ([15adc38](https://github.com/Agoric/agoric-sdk/commit/15adc38228fe14dfac4a52a647b47d3013818aec))
* **lockdown:** Begin working toward lockdown-style SES API ([3e63758](https://github.com/Agoric/agoric-sdk/commit/3e63758fbd0e197cb012d96dbd7d25a2bdd162e3))
* **metering:** get all tests working again ([f2a3206](https://github.com/Agoric/agoric-sdk/commit/f2a3206ad3c4ba98b225380a289bf49a12857a00))
* **metering:** more cleanups and documentation ([78ced24](https://github.com/Agoric/agoric-sdk/commit/78ced244d3028eadf4689bf44b7407f524ae509f))
* **tame-metering:** get working under SES 1.0 ([8246884](https://github.com/Agoric/agoric-sdk/commit/82468844e4d5ac8a6b1ad46c1009cf0719e701ea))
* **tame-metering:** new implementation of isConstructor ([362456d](https://github.com/Agoric/agoric-sdk/commit/362456d9e6dc0eb0d139eb1c777c43a877db0cf9))
* **tame-metering:** remove .prototype via bind if necessary ([a77c7e3](https://github.com/Agoric/agoric-sdk/commit/a77c7e37e76c366ec5f6d039afc8e4872b533226))
* **transform-metering:** only enable meters; the host has to disable ([d1b8e84](https://github.com/Agoric/agoric-sdk/commit/d1b8e84361b7ebebb363373dd730f10383e46ef8))


### Features

* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/agoric-sdk/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **tame-metering:** new packages for metering ([d421bc5](https://github.com/Agoric/agoric-sdk/commit/d421bc52a7a7c7f781abd37305bc6d6c860c4cbb))
* **tame-metering:** no more Proxy, clean up initialization ([467d62b](https://github.com/Agoric/agoric-sdk/commit/467d62b251d576284d35fd33472ac6c58a0c6d52))
