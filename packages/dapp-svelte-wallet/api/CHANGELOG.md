# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.5.0](https://github.com/Agoric/agoric/compare/@agoric/dapp-svelte-wallet-api@0.5.0-dev.0...@agoric/dapp-svelte-wallet-api@0.5.0) (2020-11-06)


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
