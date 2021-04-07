# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.7.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.7.0...@agoric/dapp-svelte-wallet-api@0.7.1) (2021-04-07)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.7.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.6.1...@agoric/dapp-svelte-wallet-api@0.7.0) (2021-04-06)


### Bug Fixes

* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric/issues/2709)) ([85b674e](https://github.com/Agoric/agoric/commit/85b674e7942443219fa9828841cc7bd8ef909b47))


### Features

* integrate the economy's central token in chain bootstrap ([2288e60](https://github.com/Agoric/agoric/commit/2288e60bf2d85e2c9c9b08c479dbaad41284f55d))
* **dapp-svelte-wallet:** add getAgoricNames and getNamesByAddress ([7c8f4d5](https://github.com/Agoric/agoric/commit/7c8f4d55cd3956267a72882303d4430a72a58e70))





## [0.6.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.6.0...@agoric/dapp-svelte-wallet-api@0.6.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric/issues/2018)





# [0.6.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.3...@agoric/dapp-svelte-wallet-api@0.6.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric/issues/2647)
* **dapp-svelte-wallet:** add Far/Data annotations ([a826805](https://github.com/Agoric/agoric/commit/a826805d8734f6b5a02c0437726a87781e9ff0be)), closes [#2018](https://github.com/Agoric/agoric/issues/2018)


### Features

* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric/issues/2561)) ([1620307](https://github.com/Agoric/agoric/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))
* default new purses to autodeposit ([b210b4b](https://github.com/Agoric/agoric/commit/b210b4b918e8e67ab241d5d0c8907b437e58fc6c))





## [0.5.3](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.2...@agoric/dapp-svelte-wallet-api@0.5.3) (2021-02-22)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.5.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.1...@agoric/dapp-svelte-wallet-api@0.5.2) (2021-02-16)


### Bug Fixes

* Correlate sent errors with received errors ([73b9cfd](https://github.com/Agoric/agoric/commit/73b9cfd33cf7842bdc105a79592028649cb1c92a))
* Far and Remotable do unverified local marking rather than WeakMap ([#2361](https://github.com/Agoric/agoric/issues/2361)) ([ab59ab7](https://github.com/Agoric/agoric/commit/ab59ab779341b9740827b7c4cca4680e7b7212b2))
* message batches reduce wallet setup from 80 to 20 chain trips ([7d17f2f](https://github.com/Agoric/agoric/commit/7d17f2f5f7585adb5ae02a26489ef2e9abe7c5bb))
* review comments ([7db7e5c](https://github.com/Agoric/agoric/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* wire through the CapTP bootstrap message ([7af41bc](https://github.com/Agoric/agoric/commit/7af41bc13a778c4872863e2060874910d6c1fefa))





## [0.5.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.0...@agoric/dapp-svelte-wallet-api@0.5.1) (2020-12-10)


### Bug Fixes

* add more types and refactor naming of facets ([8f81091](https://github.com/Agoric/agoric/commit/8f810917e63aa8a2b78a523213310285abd49f8a))
* minor fixes while debugging purse notifiers ([bc4992a](https://github.com/Agoric/agoric/commit/bc4992ac65bba9007d44d242d6f0144072bf717b))
* replace "observable purse" with getCurrentAmountNotifier ([bdebc9e](https://github.com/Agoric/agoric/commit/bdebc9eedcb283ab6d12d40b1b3258cd1919d2fa))





# [0.5.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.0-dev.0...@agoric/dapp-svelte-wallet-api@0.5.0) (2020-11-07)


### Bug Fixes

* make wallet more robust, and handle decimals fully ([9c29e10](https://github.com/Agoric/agoric/commit/9c29e10225c3aef0717661674a7bdbdb2318231f))
* put all parsing and stringification into the wallet ui ([58ff9a3](https://github.com/Agoric/agoric/commit/58ff9a32f10778e76e379d8a81cabf655c26c580))


### Features

* update wallet for decimals ([898ce50](https://github.com/Agoric/agoric/commit/898ce50978bfeae94b5d342d94a0188b9a060a47))





# [0.5.0-dev.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.4.0...@agoric/dapp-svelte-wallet-api@0.5.0-dev.0) (2020-10-19)


### Features

* **zoe:** export src/contractFacet/fakeVatAdmin for dapps ([ea8568f](https://github.com/Agoric/agoric/commit/ea8568f7d2b67b10507d911c6585b1728ad3d011))





# [0.4.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.2...@agoric/dapp-svelte-wallet-api@0.4.0) (2020-10-11)


### Bug Fixes

* **wallet:** propagate offer handler exceptions to the WebSocket ([3965361](https://github.com/Agoric/agoric/commit/39653616bb45546593ba49cc59a8e6a0d1b515f2))
* add getBootstrap method to handler object ([bb1f525](https://github.com/Agoric/agoric/commit/bb1f5256bd6ab49c83cb46aee9e3a6557293f5b6))
* properly update inbox petnames ([00477b5](https://github.com/Agoric/agoric/commit/00477b58a0995d1cc1ad11f33312abaf7749fb20))


### Features

* allow CapTP URL handlers ([b3e1e61](https://github.com/Agoric/agoric/commit/b3e1e61b2a2dee7bd203bcffa23b2d1d5d1409bd))
* cleanups and fixes to the wallet ([db525f8](https://github.com/Agoric/agoric/commit/db525f85a72c578bffcd055c151743fa8176dcd2))
* pass through URL search params via wallet-bridge.html ([643636e](https://github.com/Agoric/agoric/commit/643636e3a0de564b4574a134368963a569252a96))





## [0.3.1-dev.2](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.1...@agoric/dapp-svelte-wallet-api@0.3.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.3.1-dev.1](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.1-dev.0...@agoric/dapp-svelte-wallet-api@0.3.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





## [0.3.1-dev.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.3.0...@agoric/dapp-svelte-wallet-api@0.3.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-api





# [0.3.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.2.0...@agoric/dapp-svelte-wallet-api@0.3.0) (2020-09-16)


### Bug Fixes

* need to expose the wallet bridge to the dapp ([e520b8f](https://github.com/Agoric/agoric/commit/e520b8fc2afa6f24447140fa54581f4c25cf08cb))


### Features

* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





# 0.2.0 (2020-08-31)


### Bug Fixes

* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric/issues/1409)) ([2375b28](https://github.com/Agoric/agoric/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* make rename return a promise so as not to race ([712b095](https://github.com/Agoric/agoric/commit/712b095bb0d6157ea176d7c7a82aef92757d860c))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric/issues/1628)) ([1bae122](https://github.com/Agoric/agoric/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))


### Features

* add the Svelte wallet ([f950400](https://github.com/Agoric/agoric/commit/f950400eeb9323729616012ff1c319d05e087e93))
* use SES for the wallet frontend ([3ba89dc](https://github.com/Agoric/agoric/commit/3ba89dc4b2f5cf1d3a2cf60b3c7694a2dbf456c9))
