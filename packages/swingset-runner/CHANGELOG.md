# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.12.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.7...@agoric/swingset-runner@0.12.8) (2021-04-07)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.1...@agoric/swingset-runner@0.12.7) (2021-04-06)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.0...@agoric/swingset-runner@0.12.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





# [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.11.1...@agoric/swingset-runner@0.12.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **demo:** make demos robust against bigints in JSON.stringify ([c289502](https://github.com/Agoric/agoric-sdk/commit/c289502a922ce819a2890e3aa36c0fea8ef3b6be))
* clean up the autobench script and prefix the metrics ([adeeb08](https://github.com/Agoric/agoric-sdk/commit/adeeb08b62a69e01e3398b3c5b8a4ecf0735286a))
* don't keep autobench stats for multiple revisions ([dae985d](https://github.com/Agoric/agoric-sdk/commit/dae985d24b27f086da25d7f77c65de51853e693f))
* enable autobench_* metrics ([d06a87b](https://github.com/Agoric/agoric-sdk/commit/d06a87bcb71cf150a5f9a7d383a0fa5d0c2dac69))
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))


### Features

* **autobench:** make metrics more regular; run more benchmarks ([a0ec399](https://github.com/Agoric/agoric-sdk/commit/a0ec3997f05ecc6b30fea8524a6e2742c3a33bf8))
* **autobench:** rewrite in JS ([b4dd503](https://github.com/Agoric/agoric-sdk/commit/b4dd5033db0ccdf88604f31b8924e07a57bee45a))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))





## [0.11.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.11.0...@agoric/swingset-runner@0.11.1) (2021-02-22)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.10.0...@agoric/swingset-runner@0.11.0) (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* tolerate symbols as property names ([#2094](https://github.com/Agoric/agoric-sdk/issues/2094)) ([15022fe](https://github.com/Agoric/agoric-sdk/commit/15022fe7f3fd3d1fc67687f3b010968725c30a7e))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))


### Features

* add GitHub action to run post-CI benchmark ([0dc6335](https://github.com/Agoric/agoric-sdk/commit/0dc63357fa166afa2b45a47f8ce284c7fc0d4ef4))
* add support for post-CI automated benchmarking ([2bdd9db](https://github.com/Agoric/agoric-sdk/commit/2bdd9db4d3f553a58b0ca5245d9159fcb5432d80))
* pluralize `resolve` syscall ([6276286](https://github.com/Agoric/agoric-sdk/commit/6276286b5553f13d3cb267c8015f83921a6caf9d))
* promise resolution notification refactoring ([4ffb911](https://github.com/Agoric/agoric-sdk/commit/4ffb91147dbdae971111d7f2fa1e5c9cdc1ae578))
* publish benchmarks stats to GitHub artifact ([cce6d36](https://github.com/Agoric/agoric-sdk/commit/cce6d36a9dd8411b2e1fce2598bfd8725d628438))
* refactor notification and subscription ([dd5f7f7](https://github.com/Agoric/agoric-sdk/commit/dd5f7f7fc5b6ae7f8bee4f123821d92a26581af4))
* slogulator annotation enhancements ([1c09876](https://github.com/Agoric/agoric-sdk/commit/1c09876f8998fabe8021ca24b8e60ae7b27825d2))
* vat-side promise ID retirement ([94e0078](https://github.com/Agoric/agoric-sdk/commit/94e0078673ff15e47c2fcf32f472d27c416a1cd8))





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.9.0...@agoric/swingset-runner@0.10.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* The Slogulator Mk I ([42c5fdc](https://github.com/Agoric/agoric-sdk/commit/42c5fdcb78aa058a72db96adce19e8b8e1b7eba7))





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.9.0-dev.0...@agoric/swingset-runner@0.9.0) (2020-11-07)


### Bug Fixes

* further cleanup based on reviews ([2e74cc7](https://github.com/Agoric/agoric-sdk/commit/2e74cc72ce1c898b24c1a2613d7864d97fe383c2))
* rework virtual objects implementation to use revised API design ([4c4c1c9](https://github.com/Agoric/agoric-sdk/commit/4c4c1c93f862b3aea990c7c7d556b7c6b949448d))


### Features

* implement virtual objects kept in vat secondary storage ([9f4ae1a](https://github.com/Agoric/agoric-sdk/commit/9f4ae1a4ecda4245291f846149bab6c95c96634c))





# [0.9.0-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.8.0...@agoric/swingset-runner@0.9.0-dev.0) (2020-10-19)


### Features

* split exchange benchmark rounds in two ([94fdfdc](https://github.com/Agoric/agoric-sdk/commit/94fdfdcc7a06b1645e184d9533f8b87c5a80761f))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.2...@agoric/swingset-runner@0.8.0) (2020-10-11)


### Bug Fixes

* update swingset runner demos for latest zoe incarnation ([c169ffd](https://github.com/Agoric/agoric-sdk/commit/c169ffd3568d8f4042b10b92da1b8f96fda19a7d))


### Features

* **swingset-runner:** accept '--slog FILE' to write slogfile ([d710582](https://github.com/Agoric/agoric-sdk/commit/d71058289c97b5fee606dc0690f1289b497a5b4f))
* overhaul kernel initialization and startup ([23c3f9d](https://github.com/Agoric/agoric-sdk/commit/23c3f9df56940230e21a16b4861f40197192fdea))
* revamp vat termination API ([aa5b93c](https://github.com/Agoric/agoric-sdk/commit/aa5b93c7ea761bf805206c71bb16e586267db74d))





## [0.7.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.1...@agoric/swingset-runner@0.7.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.7.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.0...@agoric/swingset-runner@0.7.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.7.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.0...@agoric/swingset-runner@0.7.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.6.1...@agoric/swingset-runner@0.7.0) (2020-09-16)


### Features

* add swingset-runner bulk demo running tool ([401dcb2](https://github.com/Agoric/agoric-sdk/commit/401dcb228b426b9457e3e77b50fc32c3a330ea61))
* further minor perf instrumentation tweaks ([8e93cd0](https://github.com/Agoric/agoric-sdk/commit/8e93cd01c7d2ffafb3a9282a453d8bed222b0e49))
* properly terminate & clean up after failed vats ([cad2b2e](https://github.com/Agoric/agoric-sdk/commit/cad2b2e45aece7dbc150c40dea194a3fea5dbb69))





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.6.0...@agoric/swingset-runner@0.6.1) (2020-08-31)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.5.0...@agoric/swingset-runner@0.6.0) (2020-08-31)


### Bug Fixes

* clean up review issues ([9ad3b79](https://github.com/Agoric/agoric-sdk/commit/9ad3b79fe59055077ebdba5fcba762038f0f9fb2))
* correct problems that benchmarking turned up ([30f3f87](https://github.com/Agoric/agoric-sdk/commit/30f3f87d4e734b96beaf192f25212dc7d575674d))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* incorporate review feedback ([9812c61](https://github.com/Agoric/agoric-sdk/commit/9812c61ecf489b41769316fb872ee7cc9cc5460f))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* minor fix to zoeTest benchmark ([067dc9b](https://github.com/Agoric/agoric-sdk/commit/067dc9b346ab2ed6a8680eeeef14695679002111))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))


### Features

* augment kernelDump to account for dynamic vat schema additions ([b7dde66](https://github.com/Agoric/agoric-sdk/commit/b7dde669dccfec3c052ee5ca7348ebd7edd2854b))
* clean up after dead vats ([7fa2661](https://github.com/Agoric/agoric-sdk/commit/7fa2661eeddcad36609bf9d755ff1c5b07241f53))
* display kernel objects & promises in numeric order ([c344b41](https://github.com/Agoric/agoric-sdk/commit/c344b41670d4e368131995dda2254a266a2587e4))
* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)
* new iterated Zoe benchmark that uses atomicSwap ([3719907](https://github.com/Agoric/agoric-sdk/commit/3719907e1090af9ad82db2f966c9b523dfb9a55f))
* phase 1 of vat termination: stop talking to or about the vat ([0b1aa20](https://github.com/Agoric/agoric-sdk/commit/0b1aa20630e9c33479d2c4c31a07723819598dab))
* support use of module references in swingset config sourceSpecs ([1c02653](https://github.com/Agoric/agoric-sdk/commit/1c0265353dcbb88fa5d2c7d80d53ebadee49936d))
* swingset-runner zoe demos to use pre-bundled zcf ([3df964a](https://github.com/Agoric/agoric-sdk/commit/3df964a10f61715fa2d72b1c408bb1903df61181))
* update exchange benchmark to re-use simpleExchange contract ([3ecbee0](https://github.com/Agoric/agoric-sdk/commit/3ecbee059197dea5ff37a21465f68be9bcb463b8))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.2...@agoric/swingset-runner@0.5.0) (2020-06-30)


### Bug Fixes

* deal more gracefully with data sources that have a common base file name ([f05f3ba](https://github.com/Agoric/agoric-sdk/commit/f05f3ba70879d0312446f930881f32192fae42d6))
* eslint is tricksy, it is ([1245ebb](https://github.com/Agoric/agoric-sdk/commit/1245ebb686fd20112f17f6c3f5f422de76709e19))
* miscellaneous cleanups ([b184312](https://github.com/Agoric/agoric-sdk/commit/b184312046fa3425b8051601eece3bc5f9d68889))


### Features

* add benchmarking support to swingset-runner ([19a4ef7](https://github.com/Agoric/agoric-sdk/commit/19a4ef7b87c661b6774a4532e401dd96a23b0a3d))
* add facility for capturing and graphing kernel stats ([0df83b3](https://github.com/Agoric/agoric-sdk/commit/0df83b3b198632003abd38026b3136e21f99cd0b))
* add hook to pre-execute one round of benchmarking before starting to measure ([890f88a](https://github.com/Agoric/agoric-sdk/commit/890f88a511e8346c926a4c6fbf2f2320b404a9c2))
* add stats dumping capability to swingset runner and kernel dumper ([83efadc](https://github.com/Agoric/agoric-sdk/commit/83efadc6325ea78097d00401888712f15ccf1dce))
* count number of times various stats variables are incremented and decremented ([129f02f](https://github.com/Agoric/agoric-sdk/commit/129f02fb3c5a44950fa0ab12a715fc2f18911c08))
* kernel promise reference counting ([ba1ebc7](https://github.com/Agoric/agoric-sdk/commit/ba1ebc7b2561c6a4c856b16d4a24ba38a40d0d74))
* support value return from `bootstrap` and other exogenous messages ([a432606](https://github.com/Agoric/agoric-sdk/commit/a43260608412025991bcad3a48b20a486c3dbe15))
* Zoe simpleExchange perf test in swingset-runner ([79da155](https://github.com/Agoric/agoric-sdk/commit/79da15578750485b25a64626248078aee844c42e))





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.1...@agoric/swingset-runner@0.4.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.0...@agoric/swingset-runner@0.4.1) (2020-05-10)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0...@agoric/swingset-runner@0.4.0) (2020-05-04)


### Bug Fixes

* lint... ([1db8eac](https://github.com/Agoric/agoric-sdk/commit/1db8eacd5fdb0e6d6ec6d2f93bd29e7c9291da30))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* add crank number to kernel state ([75e5d53](https://github.com/Agoric/agoric-sdk/commit/75e5d53d36862e630b3ee8e9628d2237493eb8ae))
* Add support for dumping crank-by-crank snapshots of the kernel state as a swingset runs ([b49929e](https://github.com/Agoric/agoric-sdk/commit/b49929ed7139544e218601135bdfd3408ea770de))
* Improved console log diagnostics ([465329d](https://github.com/Agoric/agoric-sdk/commit/465329d1d7f740e82fa46da24be370e2081fcb33))





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0-alpha.0...@agoric/swingset-runner@0.3.0) (2020-04-13)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.3.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1...@agoric/swingset-runner@0.3.0-alpha.0) (2020-04-12)


### Bug Fixes

* shut up eslint ([fcc1ff3](https://github.com/Agoric/agoric-sdk/commit/fcc1ff33ffc26dde787c36413e094365e1d09c03))


### Features

* Be smarter about where database files are located. ([2eb1469](https://github.com/Agoric/agoric-sdk/commit/2eb14694a108899f1bafb725e3e0b4a34150a07f))
* new tool -- kernel state dump utility ([f55110e](https://github.com/Agoric/agoric-sdk/commit/f55110e0e4f5963faf1ff86895cd3d0120bb7eca))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1-alpha.0...@agoric/swingset-runner@0.2.1) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.2.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.0...@agoric/swingset-runner@0.2.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





# 0.2.0 (2020-03-26)


### Features

* Add option to force GC after every block, add 'help' command, clean up error reporting ([e639ee5](https://github.com/Agoric/agoric-sdk/commit/e639ee5d69ce27eef40a8f0c6c8726dd81f8de3d))
* Add PDF and stdout support to stat-logger graphing ([22238e7](https://github.com/Agoric/agoric-sdk/commit/22238e75eb3e0726a7385c783c8f7678c48884d8))
* Log (and graph) database disk usage ([9f9f5af](https://github.com/Agoric/agoric-sdk/commit/9f9f5af964d6661bb1d6bd1f2ea91098bcad62b0))
