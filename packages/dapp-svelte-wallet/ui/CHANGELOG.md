# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.6.2...@agoric/dapp-svelte-wallet-ui@1.6.3) (2021-04-07)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





## [1.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.6.1...@agoric/dapp-svelte-wallet-ui@1.6.2) (2021-04-06)


### Bug Fixes

* improve amount UI entry ([#2737](https://github.com/Agoric/agoric-sdk/issues/2737)) ([bc7e2ce](https://github.com/Agoric/agoric-sdk/commit/bc7e2ceaee05f3ab2eb362664722323bca62a4c9))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))





## [1.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.6.0...@agoric/dapp-svelte-wallet-ui@1.6.1) (2021-03-24)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





# [1.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.5.2...@agoric/dapp-svelte-wallet-ui@1.6.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))
* work around Firefox's lack of Error.stackTraceLimit ([94eaa4a](https://github.com/Agoric/agoric-sdk/commit/94eaa4a0caaa15f4c609ffd06afc3651e4d0d3bc))


### Features

* allow fresh access tokens to override stale ones ([98acaee](https://github.com/Agoric/agoric-sdk/commit/98acaeed7f3d33a7f4631292b9187e3b4a1df7b6))





## [1.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.5.1...@agoric/dapp-svelte-wallet-ui@1.5.2) (2021-02-22)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





## [1.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.5.0...@agoric/dapp-svelte-wallet-ui@1.5.1) (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [1.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.4.0...@agoric/dapp-svelte-wallet-ui@1.5.0) (2020-12-10)


### Bug Fixes

* add more types and refactor naming of facets ([8f81091](https://github.com/Agoric/agoric-sdk/commit/8f810917e63aa8a2b78a523213310285abd49f8a))
* don't stack up reopeners ([be3f146](https://github.com/Agoric/agoric-sdk/commit/be3f146852eb482b07c0e9e153db66637a57381c))
* store the current state of the ListCard in localStorage ([ed6d7c1](https://github.com/Agoric/agoric-sdk/commit/ed6d7c1fbb71bca410e6688acbf4556cb8601b87))
* suppress auto-expand in setup page ([875af56](https://github.com/Agoric/agoric-sdk/commit/875af56419d8e6559eabff9518ca4b3614e36128))
* use the actual header height for the disconnect overlay ([e13a9d9](https://github.com/Agoric/agoric-sdk/commit/e13a9d9127a2d8d4220e2f9d159f18b154702649))


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* make wallet elements start out expanded ([40bfda1](https://github.com/Agoric/agoric-sdk/commit/40bfda1e9ee716a6104c05feb6bff6e953a239ce))
* stash the accessToken in localStorage ([a8ce36c](https://github.com/Agoric/agoric-sdk/commit/a8ce36c7ef3ffe94b07629f2108206c6187dc675))





# [1.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.3.1-dev.0...@agoric/dapp-svelte-wallet-ui@1.4.0) (2020-11-07)


### Bug Fixes

* excise `conventionalDecimalPlaces` for now ([0e7c896](https://github.com/Agoric/agoric-sdk/commit/0e7c896ed0ea261aa76b07f3d9c5df640c42699e))
* make wallet more robust, and handle decimals fully ([9c29e10](https://github.com/Agoric/agoric-sdk/commit/9c29e10225c3aef0717661674a7bdbdb2318231f))
* properly display rejected offer manipulation ([420a524](https://github.com/Agoric/agoric-sdk/commit/420a524d92c21fd572db9f06637019170336e82c))
* put all parsing and stringification into the wallet ui ([58ff9a3](https://github.com/Agoric/agoric-sdk/commit/58ff9a32f10778e76e379d8a81cabf655c26c580))
* remove unreferenced variable ([d908153](https://github.com/Agoric/agoric-sdk/commit/d9081532d0a50f82e2ac0d2f25655b607d012c84))


### Features

* update wallet for decimals ([898ce50](https://github.com/Agoric/agoric-sdk/commit/898ce50978bfeae94b5d342d94a0188b9a060a47))
* **assert:** Thread stack traces to console, add entangled assert ([#1884](https://github.com/Agoric/agoric-sdk/issues/1884)) ([5d4f35f](https://github.com/Agoric/agoric-sdk/commit/5d4f35f901f2ca40a2a4d66dab980a5fe8e575f4))





## [1.3.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.3.0...@agoric/dapp-svelte-wallet-ui@1.3.1-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





# [1.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.2.1-dev.2...@agoric/dapp-svelte-wallet-ui@1.3.0) (2020-10-11)


### Features

* cleanups and fixes to the wallet ([db525f8](https://github.com/Agoric/agoric-sdk/commit/db525f85a72c578bffcd055c151743fa8176dcd2))





## [1.2.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.2.1-dev.1...@agoric/dapp-svelte-wallet-ui@1.2.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





## [1.2.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.2.1-dev.0...@agoric/dapp-svelte-wallet-ui@1.2.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





## [1.2.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.2.0...@agoric/dapp-svelte-wallet-ui@1.2.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





# [1.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.1.1...@agoric/dapp-svelte-wallet-ui@1.2.0) (2020-09-16)


### Bug Fixes

* change webkey -> accessToken and polish usage ([0362abe](https://github.com/Agoric/agoric-sdk/commit/0362abe1f6aa1322d50826e77c052881d940f72e))
* implement robust plugin persistence model ([2de552e](https://github.com/Agoric/agoric-sdk/commit/2de552ed4a4b25e5fcc641ff5e80afd5af1d167d))
* SECURITY: use a private on-disk webkey for trusted auth ([f769d95](https://github.com/Agoric/agoric-sdk/commit/f769d95031f8e0b2003d31f0554dce17d6440f1b))


### Features

* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric-sdk/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





## [1.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/dapp-svelte-wallet-ui@1.1.0...@agoric/dapp-svelte-wallet-ui@1.1.1) (2020-08-31)

**Note:** Version bump only for package @agoric/dapp-svelte-wallet-ui





# 1.1.0 (2020-08-31)


### Bug Fixes

* don't pluralise anything but the last path element ([e173dbc](https://github.com/Agoric/agoric-sdk/commit/e173dbc9744e80bdc3fcd50d9530a2144e717bf1))
* highlight selected menu ([4c3c169](https://github.com/Agoric/agoric-sdk/commit/4c3c1690f92992634a64d5bbc05d4ccd3ba1b1c1))
* introduce summaryLine to allow tooltip with ripple ([08393a8](https://github.com/Agoric/agoric-sdk/commit/08393a8edd64efaa831c29f341d4b4bedb93302f))
* make MenuButton more subtle ([3cd6315](https://github.com/Agoric/agoric-sdk/commit/3cd63150bb7a8cb2347f9625e855321fe173d2bf))
* more cleanups ([b2cff30](https://github.com/Agoric/agoric-sdk/commit/b2cff30167f4646ae3ff3aa47afcc5534ae03155))
* more UI cleanups ([ac1d2f7](https://github.com/Agoric/agoric-sdk/commit/ac1d2f72a0365ea9bc912daf0454819e25f7752d))
* rely on HandledPromise shim ([5eb8e30](https://github.com/Agoric/agoric-sdk/commit/5eb8e30d0b726b596173d9ce00a6df46fdeac51d))
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
