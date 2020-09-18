# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.2-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2-dev.1...@agoric/ertp@0.7.2-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.2-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2-dev.0...@agoric/ertp@0.7.2-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.2-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.1...@agoric/ertp@0.7.2-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.0...@agoric/ertp@0.7.1) (2020-09-16)


### Bug Fixes

* declare amountMathKind parameter to makeissuerkit optional ([a21832a](https://github.com/Agoric/agoric-sdk/commit/a21832a9a2b88aa43d2b532a5b92f99c47d3e11b)), closes [#1373](https://github.com/Agoric/agoric-sdk/issues/1373)





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.6.0...@agoric/ertp@0.7.0) (2020-08-31)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* clean up E.when and E.resolve ([#1561](https://github.com/Agoric/agoric-sdk/issues/1561)) ([634046c](https://github.com/Agoric/agoric-sdk/commit/634046c0fc541fc1db258105a75c7313b5668aa0))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric-sdk/issues/1628)) ([1bae122](https://github.com/Agoric/agoric-sdk/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))
* **zoe:** unify InstanceRecord usage (.instanceHandle -> .handle) ([9af7903](https://github.com/Agoric/agoric-sdk/commit/9af790322fc84a3aa1e41e957614fea2873c63b1))
* update JS typings ([20941e6](https://github.com/Agoric/agoric-sdk/commit/20941e675302ee5905e4825638e661065ad5d3f9))


### Features

* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.5...@agoric/ertp@0.6.0) (2020-06-30)


### Bug Fixes

* **ERTP:** use install-ses for tests ([41478e5](https://github.com/Agoric/agoric-sdk/commit/41478e53c35a087a69b4c1a741007c3170a7b6ce))
* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))





## [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.4...@agoric/ertp@0.5.5) (2020-05-17)

**Note:** Version bump only for package @agoric/ertp





## [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.3...@agoric/ertp@0.5.4) (2020-05-10)

**Note:** Version bump only for package @agoric/ertp





## [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.2...@agoric/ertp@0.5.3) (2020-05-04)


### Bug Fixes

* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))
* **zoe:** Invitation to offer refactored to use upcall ([#853](https://github.com/Agoric/agoric-sdk/issues/853)) ([c142b7a](https://github.com/Agoric/agoric-sdk/commit/c142b7a64e77262927da22bde3af5793a9d39c2a))





## [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.2-alpha.0...@agoric/ertp@0.5.2) (2020-04-13)

**Note:** Version bump only for package @agoric/ertp





## [0.5.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.1...@agoric/ertp@0.5.2-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/ertp





## [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.1-alpha.0...@agoric/ertp@0.5.1) (2020-04-02)

**Note:** Version bump only for package @agoric/ertp





## [0.5.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.0...@agoric/ertp@0.5.1-alpha.0) (2020-04-02)


### Tests

* convert some tests from try/catch/finally to t.plan() ([df8e686](https://github.com/Agoric/agoric-sdk/commit/df8e686bb2ea3a95e67cff930b9bfe46850f017d))





# 0.5.0 (2020-03-26)


### Bug Fixes

* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/ertp/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))


### Features

* make ERTP methods acccept promises or payments ([4b7f060](https://github.com/Agoric/ertp/commit/4b7f06048bb0f86c2028a9c9cfae8ff90b595bd7))
