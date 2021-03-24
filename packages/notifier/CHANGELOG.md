# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.3...@agoric/notifier@0.3.4) (2021-03-24)

**Note:** Version bump only for package @agoric/notifier





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.2...@agoric/notifier@0.3.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **notifier:** add Far/Data to notifier ([#2565](https://github.com/Agoric/agoric-sdk/issues/2565)) ([49a6a8e](https://github.com/Agoric/agoric-sdk/commit/49a6a8ef765f0a6cc94d7f7b0a4b2e8ed71bce8e)), closes [#2545](https://github.com/Agoric/agoric-sdk/issues/2545) [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.1...@agoric/notifier@0.3.2) (2021-02-22)

**Note:** Version bump only for package @agoric/notifier





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.0...@agoric/notifier@0.3.1) (2021-02-16)


### Bug Fixes

* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.3...@agoric/notifier@0.3.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





## [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.3-dev.0...@agoric/notifier@0.2.3) (2020-11-07)

**Note:** Version bump only for package @agoric/notifier





## [0.2.3-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2...@agoric/notifier@0.2.3-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.2...@agoric/notifier@0.2.2) (2020-10-11)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.1...@agoric/notifier@0.2.2-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.0...@agoric/notifier@0.2.2-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.1...@agoric/notifier@0.2.2-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.0...@agoric/notifier@0.2.1) (2020-09-16)

**Note:** Version bump only for package @agoric/notifier





# [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.3...@agoric/notifier@0.2.0) (2020-08-31)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* clean up E.when and E.resolve ([#1561](https://github.com/Agoric/agoric-sdk/issues/1561)) ([634046c](https://github.com/Agoric/agoric-sdk/commit/634046c0fc541fc1db258105a75c7313b5668aa0))
* kickOut takes a `reason` error rather than a `message` string ([#1567](https://github.com/Agoric/agoric-sdk/issues/1567)) ([c3cd536](https://github.com/Agoric/agoric-sdk/commit/c3cd536f16dcf30208d88fb1c81376aa916e2a40))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename produceNotifier to makeNotifierKit ([#1330](https://github.com/Agoric/agoric-sdk/issues/1330)) ([e5034f9](https://github.com/Agoric/agoric-sdk/commit/e5034f94e33e9c90c6a8fcaff70c11773e13e969))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))


### Features

* adaptors between notifiers and async iterables ([#1340](https://github.com/Agoric/agoric-sdk/issues/1340)) ([b67d21a](https://github.com/Agoric/agoric-sdk/commit/b67d21aae7e66202e3a5a3f13c7bd5769061230e))





## [0.1.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.2...@agoric/notifier@0.1.3) (2020-06-30)

**Note:** Version bump only for package @agoric/notifier





## [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.1...@agoric/notifier@0.1.2) (2020-05-17)

**Note:** Version bump only for package @agoric/notifier





## [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.0...@agoric/notifier@0.1.1) (2020-05-10)

**Note:** Version bump only for package @agoric/notifier





# 0.1.0 (2020-05-04)


### Features

* Add a notifier facility for Zoe and contracts ([7d6e2a6](https://github.com/Agoric/agoric-sdk/commit/7d6e2a6eae5793c2a4b451405a0f4337bfcaa448))








## 0.0.1 (2020-04-15)

Initial Version
