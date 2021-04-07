# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.8.0...@agoric/dapp-svelte-wallet@0.8.1) (2021-04-07)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.7.1...@agoric/dapp-svelte-wallet@0.8.0) (2021-04-06)


### Bug Fixes

* improve amount UI entry ([#2737](https://github.com/Agoric/agoric-sdk/issues/2737)) ([bc7e2ce](https://github.com/Agoric/agoric-sdk/commit/bc7e2ceaee05f3ab2eb362664722323bca62a4c9))
* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric-sdk/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric-sdk/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric-sdk/issues/2709)) ([85b674e](https://github.com/Agoric/agoric-sdk/commit/85b674e7942443219fa9828841cc7bd8ef909b47))


### Features

* integrate the economy's central token in chain bootstrap ([2288e60](https://github.com/Agoric/agoric-sdk/commit/2288e60bf2d85e2c9c9b08c479dbaad41284f55d))
* **dapp-svelte-wallet:** add getAgoricNames and getNamesByAddress ([7c8f4d5](https://github.com/Agoric/agoric-sdk/commit/7c8f4d55cd3956267a72882303d4430a72a58e70))





## [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.7.0...@agoric/dapp-svelte-wallet@0.7.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.6.2...@agoric/dapp-svelte-wallet@0.7.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **dapp-svelte-wallet:** add Far/Data annotations ([a826805](https://github.com/Agoric/agoric-sdk/commit/a826805d8734f6b5a02c0437726a87781e9ff0be)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))
* work around Firefox's lack of Error.stackTraceLimit ([94eaa4a](https://github.com/Agoric/agoric-sdk/commit/94eaa4a0caaa15f4c609ffd06afc3651e4d0d3bc))


### Features

* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric-sdk/issues/2561)) ([1620307](https://github.com/Agoric/agoric-sdk/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))
* allow fresh access tokens to override stale ones ([98acaee](https://github.com/Agoric/agoric-sdk/commit/98acaeed7f3d33a7f4631292b9187e3b4a1df7b6))
* default new purses to autodeposit ([b210b4b](https://github.com/Agoric/agoric-sdk/commit/b210b4b918e8e67ab241d5d0c8907b437e58fc6c))





## [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.6.1...@agoric/dapp-svelte-wallet@0.6.2) (2021-02-22)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.6.0...@agoric/dapp-svelte-wallet@0.6.1) (2021-02-16)


### Bug Fixes

* Correlate sent errors with received errors ([73b9cfd](https://github.com/Agoric/agoric-sdk/commit/73b9cfd33cf7842bdc105a79592028649cb1c92a))
* Far and Remotable do unverified local marking rather than WeakMap ([#2361](https://github.com/Agoric/agoric-sdk/issues/2361)) ([ab59ab7](https://github.com/Agoric/agoric-sdk/commit/ab59ab779341b9740827b7c4cca4680e7b7212b2))
* message batches reduce wallet setup from 80 to 20 chain trips ([7d17f2f](https://github.com/Agoric/agoric-sdk/commit/7d17f2f5f7585adb5ae02a26489ef2e9abe7c5bb))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* wire through the CapTP bootstrap message ([7af41bc](https://github.com/Agoric/agoric-sdk/commit/7af41bc13a778c4872863e2060874910d6c1fefa))





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.5.0...@agoric/dapp-svelte-wallet@0.6.0) (2020-12-10)


### Bug Fixes

* add more types and refactor naming of facets ([8f81091](https://github.com/Agoric/agoric-sdk/commit/8f810917e63aa8a2b78a523213310285abd49f8a))
* don't stack up reopeners ([be3f146](https://github.com/Agoric/agoric-sdk/commit/be3f146852eb482b07c0e9e153db66637a57381c))
* minor fixes while debugging purse notifiers ([bc4992a](https://github.com/Agoric/agoric-sdk/commit/bc4992ac65bba9007d44d242d6f0144072bf717b))
* replace "observable purse" with getCurrentAmountNotifier ([bdebc9e](https://github.com/Agoric/agoric-sdk/commit/bdebc9eedcb283ab6d12d40b1b3258cd1919d2fa))
* store the current state of the ListCard in localStorage ([ed6d7c1](https://github.com/Agoric/agoric-sdk/commit/ed6d7c1fbb71bca410e6688acbf4556cb8601b87))
* suppress auto-expand in setup page ([875af56](https://github.com/Agoric/agoric-sdk/commit/875af56419d8e6559eabff9518ca4b3614e36128))
* use the actual header height for the disconnect overlay ([e13a9d9](https://github.com/Agoric/agoric-sdk/commit/e13a9d9127a2d8d4220e2f9d159f18b154702649))


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* make wallet elements start out expanded ([40bfda1](https://github.com/Agoric/agoric-sdk/commit/40bfda1e9ee716a6104c05feb6bff6e953a239ce))
* stash the accessToken in localStorage ([a8ce36c](https://github.com/Agoric/agoric-sdk/commit/a8ce36c7ef3ffe94b07629f2108206c6187dc675))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.5.0-dev.0...@agoric/dapp-svelte-wallet@0.5.0) (2020-11-07)


### Bug Fixes

* excise `conventionalDecimalPlaces` for now ([0e7c896](https://github.com/Agoric/agoric-sdk/commit/0e7c896ed0ea261aa76b07f3d9c5df640c42699e))
* make wallet more robust, and handle decimals fully ([9c29e10](https://github.com/Agoric/agoric-sdk/commit/9c29e10225c3aef0717661674a7bdbdb2318231f))
* properly display rejected offer manipulation ([420a524](https://github.com/Agoric/agoric-sdk/commit/420a524d92c21fd572db9f06637019170336e82c))
* put all parsing and stringification into the wallet ui ([58ff9a3](https://github.com/Agoric/agoric-sdk/commit/58ff9a32f10778e76e379d8a81cabf655c26c580))
* remove unreferenced variable ([d908153](https://github.com/Agoric/agoric-sdk/commit/d9081532d0a50f82e2ac0d2f25655b607d012c84))


### Features

* update wallet for decimals ([898ce50](https://github.com/Agoric/agoric-sdk/commit/898ce50978bfeae94b5d342d94a0188b9a060a47))
* **assert:** Thread stack traces to console, add entangled assert ([#1884](https://github.com/Agoric/agoric-sdk/issues/1884)) ([5d4f35f](https://github.com/Agoric/agoric-sdk/commit/5d4f35f901f2ca40a2a4d66dab980a5fe8e575f4))





# [0.5.0-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.4.0...@agoric/dapp-svelte-wallet@0.5.0-dev.0) (2020-10-19)


### Features

* **zoe:** export src/contractFacet/fakeVatAdmin for dapps ([ea8568f](https://github.com/Agoric/agoric-sdk/commit/ea8568f7d2b67b10507d911c6585b1728ad3d011))





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.3.1-dev.2...@agoric/dapp-svelte-wallet@0.4.0) (2020-10-11)


### Bug Fixes

* **wallet:** propagate offer handler exceptions to the WebSocket ([3965361](https://github.com/Agoric/agoric-sdk/commit/39653616bb45546593ba49cc59a8e6a0d1b515f2))
* add getBootstrap method to handler object ([bb1f525](https://github.com/Agoric/agoric-sdk/commit/bb1f5256bd6ab49c83cb46aee9e3a6557293f5b6))
* properly update inbox petnames ([00477b5](https://github.com/Agoric/agoric-sdk/commit/00477b58a0995d1cc1ad11f33312abaf7749fb20))


### Features

* allow CapTP URL handlers ([b3e1e61](https://github.com/Agoric/agoric-sdk/commit/b3e1e61b2a2dee7bd203bcffa23b2d1d5d1409bd))
* cleanups and fixes to the wallet ([db525f8](https://github.com/Agoric/agoric-sdk/commit/db525f85a72c578bffcd055c151743fa8176dcd2))
* pass through URL search params via wallet-bridge.html ([643636e](https://github.com/Agoric/agoric-sdk/commit/643636e3a0de564b4574a134368963a569252a96))





## [0.3.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.3.1-dev.1...@agoric/dapp-svelte-wallet@0.3.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





## [0.3.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.3.1-dev.0...@agoric/dapp-svelte-wallet@0.3.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





## [0.3.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.3.0...@agoric/dapp-svelte-wallet@0.3.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.2.1...@agoric/dapp-svelte-wallet@0.3.0) (2020-09-16)


### Bug Fixes

* change webkey -> accessToken and polish usage ([0362abe](https://github.com/Agoric/agoric-sdk/commit/0362abe1f6aa1322d50826e77c052881d940f72e))
* implement robust plugin persistence model ([2de552e](https://github.com/Agoric/agoric-sdk/commit/2de552ed4a4b25e5fcc641ff5e80afd5af1d167d))
* need to expose the wallet bridge to the dapp ([e520b8f](https://github.com/Agoric/agoric-sdk/commit/e520b8fc2afa6f24447140fa54581f4c25cf08cb))
* SECURITY: use a private on-disk webkey for trusted auth ([f769d95](https://github.com/Agoric/agoric-sdk/commit/f769d95031f8e0b2003d31f0554dce17d6440f1b))


### Features

* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric-sdk/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet@0.2.0...@agoric/dapp-svelte-wallet@0.2.1) (2020-08-31)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet





# 0.2.0 (2020-08-31)


### Bug Fixes

* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* don't pluralise anything but the last path element ([e173dbc](https://github.com/Agoric/agoric-sdk/commit/e173dbc9744e80bdc3fcd50d9530a2144e717bf1))
* highlight selected menu ([4c3c169](https://github.com/Agoric/agoric-sdk/commit/4c3c1690f92992634a64d5bbc05d4ccd3ba1b1c1))
* introduce summaryLine to allow tooltip with ripple ([08393a8](https://github.com/Agoric/agoric-sdk/commit/08393a8edd64efaa831c29f341d4b4bedb93302f))
* make MenuButton more subtle ([3cd6315](https://github.com/Agoric/agoric-sdk/commit/3cd63150bb7a8cb2347f9625e855321fe173d2bf))
* make rename return a promise so as not to race ([712b095](https://github.com/Agoric/agoric-sdk/commit/712b095bb0d6157ea176d7c7a82aef92757d860c))
* more cleanups ([b2cff30](https://github.com/Agoric/agoric-sdk/commit/b2cff30167f4646ae3ff3aa47afcc5534ae03155))
* more UI cleanups ([ac1d2f7](https://github.com/Agoric/agoric-sdk/commit/ac1d2f72a0365ea9bc912daf0454819e25f7752d))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rely on HandledPromise shim ([5eb8e30](https://github.com/Agoric/agoric-sdk/commit/5eb8e30d0b726b596173d9ce00a6df46fdeac51d))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric-sdk/issues/1628)) ([1bae122](https://github.com/Agoric/agoric-sdk/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))
* style payments ([b7e6176](https://github.com/Agoric/agoric-sdk/commit/b7e6176eb3a4c674d67e7c26069568a55b0b1659))
* tooltips within ListCards now work ([e389dd1](https://github.com/Agoric/agoric-sdk/commit/e389dd1338c50a2fc1ef53e116954058ddf0546a))
* upgrade to SES 0.10.0 ([bf8ceff](https://github.com/Agoric/agoric-sdk/commit/bf8ceff03ebb790728c18a131b6305ca7f7f4a4f))
* use petname for zoe invite display, too ([2559e0d](https://github.com/Agoric/agoric-sdk/commit/2559e0d514fd7dbb2f088b2cc48175be60938474))


### Features

* add HandledPromise shim before lockdown() ([5574462](https://github.com/Agoric/agoric-sdk/commit/55744622a7ff5909b6cc296cdf6ab0f2a6ee2e0c))
* add nav and paging, and improve formatting ([9a22fc0](https://github.com/Agoric/agoric-sdk/commit/9a22fc06343a5400436f9d60a524b691589ca5ca))
* add the Svelte wallet ([f950400](https://github.com/Agoric/agoric-sdk/commit/f950400eeb9323729616012ff1c319d05e087e93))
* introduce a $ready store for when captp is initialised ([d9d73d2](https://github.com/Agoric/agoric-sdk/commit/d9d73d240aa73a81b770c1d3ced7a9750c50b0fa))
* much better formatting ([f331df0](https://github.com/Agoric/agoric-sdk/commit/f331df0006867a4409e974aad5885e649abf2172))
* style the offers ([c74ec50](https://github.com/Agoric/agoric-sdk/commit/c74ec50f180dd9d2973ab1a6c4c2f7afb89546a8))
* use ListCard for Issuers ([a7ec550](https://github.com/Agoric/agoric-sdk/commit/a7ec5508ef740d8d230f7fb5dd8ce9f0d3df68e9))
* use SES for the wallet frontend ([3ba89dc](https://github.com/Agoric/agoric-sdk/commit/3ba89dc4b2f5cf1d3a2cf60b3c7694a2dbf456c9))
