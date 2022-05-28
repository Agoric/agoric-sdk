# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.13.0...@agoric/wallet@0.13.1) (2022-05-28)


### Bug Fixes

* **wallet-ui:** put back missing dapps notifier ([2720247](https://github.com/Agoric/agoric-sdk/commit/272024775e3670b4ead5934a82e9625631e9ea77))
* **wallet-ui:** update state when resetting wallet connection ([eff4186](https://github.com/Agoric/agoric-sdk/commit/eff4186d9b30ff53897f0c683660ea1a3a22949d))



## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.12.0...@agoric/wallet@0.13.0) (2022-05-09)


### Features

* **wallet:** support attestations in offers ([f993c0b](https://github.com/Agoric/agoric-sdk/commit/f993c0b5f44f2b8d6beba50748da0b4889a26b5c))



## [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.9...@agoric/wallet@0.12.0) (2022-04-18)


### Features

* **wallet:** support reading notifiers from offer result ([934ed3c](https://github.com/Agoric/agoric-sdk/commit/934ed3c93b587ad7501fb6c122e8ef7be84ef940))
* **wallet-api:** allow preapproved bridge to set offer meta ([adbbaaf](https://github.com/Agoric/agoric-sdk/commit/adbbaaff21c7223f840bc0b409c07be8fda7d5c4))
* **wallet-api:** expose `E(wallet).lookup()` to traverse names ([5ef561d](https://github.com/Agoric/agoric-sdk/commit/5ef561d4f0cb96c743642d8e1713239f5cfe4721))
* **wallet-api:** send `proposalTemplate.arguments` as offer args ([9c769f1](https://github.com/Agoric/agoric-sdk/commit/9c769f11cc9d04fbd8ab1898f983774b60393544))
* **wallet-ui:** cheap rendering of offer arguments ([192500d](https://github.com/Agoric/agoric-sdk/commit/192500d019bc482437ed5224a12a76b2488cb23b))


### Bug Fixes

* **wallet:** change notifiers to publicNotifiers ([2fe5492](https://github.com/Agoric/agoric-sdk/commit/2fe5492821826f31bee4f99347aeea5abbd626ab))
* **wallet-api:** don't drop unused invitations on the floor ([f63ed7e](https://github.com/Agoric/agoric-sdk/commit/f63ed7ef8f576d9f4807798c6befb46d4df517dd))
* **wallet-ui:** don't add or strip `board:` prefix ([55d0a0a](https://github.com/Agoric/agoric-sdk/commit/55d0a0a79057a735076630a7c972ea1dbd327f71))



### [0.11.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.8...@agoric/wallet@0.11.9) (2022-02-24)


### Bug Fixes

* **wallet:** don't publish depositFacet until we're ready to receive ([f448176](https://github.com/Agoric/agoric-sdk/commit/f448176fd64ef47da5af00cab029104fb187afc7))



### [0.11.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.7...@agoric/wallet@0.11.8) (2022-02-21)


### Features

* example txn ([2cc8a45](https://github.com/Agoric/agoric-sdk/commit/2cc8a45e403f6bdd80566330ddf3f6e4e9477396))
* **wallet:** keplr connection ([259345e](https://github.com/Agoric/agoric-sdk/commit/259345e56c4cd48d3ff6f47da280d5d24b3548ac))
* **wallet-ui:** use new `WalletBackendAdapter` ([4c03015](https://github.com/Agoric/agoric-sdk/commit/4c03015d2cce617b959a0f3105a99d2a29ad65cd))


### Bug Fixes

* **wallet:** dont crash when purses arent loaded before payments ([2965063](https://github.com/Agoric/agoric-sdk/commit/296506378ea6197c74976849bcc54d7c34e34da9))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* use snackbar instead of window.alert ([a233c12](https://github.com/Agoric/agoric-sdk/commit/a233c1269643f201b9214fe132cd4e0d45de3137))
* **solo:** remove a symlink dependency in exchange for web config ([42fc52b](https://github.com/Agoric/agoric-sdk/commit/42fc52b9d7bd8217038164f92f0448c4540c6e64))
* **wallet:** fix crash when deleting dapps ([51f78ae](https://github.com/Agoric/agoric-sdk/commit/51f78ae7a0fcba6a68b68a790d706abea5b6e116))
* **wallet:** fix indefinite loading state ([c58f07d](https://github.com/Agoric/agoric-sdk/commit/c58f07ddd97e6bf06da99284df6eaf2fcb5f2f46))
* **wallet:** fix offer id reference ([#4393](https://github.com/Agoric/agoric-sdk/issues/4393)) ([8c9dae7](https://github.com/Agoric/agoric-sdk/commit/8c9dae71bd3d3bf06d562f38c67dfb46be7db1ca))
* **wallet:** handle cancelled offer state ([#4292](https://github.com/Agoric/agoric-sdk/issues/4292)) ([9dd2dc4](https://github.com/Agoric/agoric-sdk/commit/9dd2dc4f0ed62bed0f6a300dc04c4f0d60d0a65a))
* **wallet:** resolve home.wallet before exiting deploy.js ([f09eb66](https://github.com/Agoric/agoric-sdk/commit/f09eb665ee76a3f1f415ca3f094a064a4ea8241e))
* **wallet-backend:** default new purses to autodeposit ([9a06a92](https://github.com/Agoric/agoric-sdk/commit/9a06a926ce1c19b3483b10b27a19f37bd493006e))
* **wallet-ui:** flatten schema into `actions` and iterators ([21bdfd1](https://github.com/Agoric/agoric-sdk/commit/21bdfd142df0aee91ad19b882a9b8f79a3894e95))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))



### [0.11.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet@0.11.6...@agoric/wallet@0.11.7) (2021-12-22)


### Features

* **wallet:** add help link to documentation ([977262e](https://github.com/Agoric/agoric-sdk/commit/977262e596259788a773f0fe17eb61fb03d30ea4))


### Bug Fixes

* **wallet:** properly get the first timerService value ([636e099](https://github.com/Agoric/agoric-sdk/commit/636e0994761998b0857232f9bdd6f0b3ac451b31))
* **wallet:** render issuer brand correctly ([f648c19](https://github.com/Agoric/agoric-sdk/commit/f648c19bbf397e9b322e7b990025157c124d2156))



### 0.11.6 (2021-12-02)

**Note:** Version bump only for package @agoric/wallet
