# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.2.0...@agoric/wallet-ui@0.3.0) (2022-10-05)


### Features

* **cli:** show status of invitations ([8506e6d](https://github.com/Agoric/agoric-sdk/commit/8506e6d87ef331e781c9d2e2251fdcf48e784e04))
* **keyManagement:** submitProvision ([94eae93](https://github.com/Agoric/agoric-sdk/commit/94eae93f20b35408efa327a5427482f3e3b087a1))
* **wallet-ui:** basic provisioning dialog ([3f01ea6](https://github.com/Agoric/agoric-sdk/commit/3f01ea656b1a88221002da033683b23634f10896))
* **wallet-ui:** bridge storage without click when possible ([84834d9](https://github.com/Agoric/agoric-sdk/commit/84834d9dac49de6482cf2f652853522169f4227f))
* **wallet-ui:** clean up ui states ([6a20c8d](https://github.com/Agoric/agoric-sdk/commit/6a20c8d3789e983b4b19f6f769610bb5de20c39d))
* **wallet-ui:** make provision dialog harder to close ([b1b2d7b](https://github.com/Agoric/agoric-sdk/commit/b1b2d7b906309f196f4d594ee8c16a14569279b3))
* **wallet-ui:** submit provision on dialog action ([8012e8f](https://github.com/Agoric/agoric-sdk/commit/8012e8f4d99c5cf8084d710a71058a38a6172889))
* **wallet-ui:** use new wallet.current node ([703eecd](https://github.com/Agoric/agoric-sdk/commit/703eecd0af917cd432d1f6a12e645a12ab9d2c39))


### Bug Fixes

* **wallet/ui:** amino encoding details (for Ledger) ([223b45d](https://github.com/Agoric/agoric-sdk/commit/223b45d0486cdd91cf06f48e6a60f5c75e06f8c0))
* avoid colliding with 'agoric' chain, e.g. in Keplr ([692084c](https://github.com/Agoric/agoric-sdk/commit/692084ce9328b11e23ab8b46025f83eb8d1b5b3d))
* **wallet-ui:** detect unprovisioned wallet ([1747d57](https://github.com/Agoric/agoric-sdk/commit/1747d5781f4ee594eca1ded76af4944c405e7000))
* **wallet-ui:** parse purse.brand in fetchCurrent ([3c8299c](https://github.com/Agoric/agoric-sdk/commit/3c8299c2f5cf70b531bf194e4f5509bf6cd6a7be))
* **wallet-ui:** show rejected offers properly ([7b77ee0](https://github.com/Agoric/agoric-sdk/commit/7b77ee0301060921dc6542daa7c4bef8960a2454))
* **wallet-ui:** wait until window loads to access keplr ([c9b4fc3](https://github.com/Agoric/agoric-sdk/commit/c9b4fc3e5a272fe4a2b6b12774b138fdfa58be95))



## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.1.2...@agoric/wallet-ui@0.2.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **wallet-ui:** remove Solo wallet support

### Features

* **wallet:** some feedback when no smart wallet ([8057c35](https://github.com/Agoric/agoric-sdk/commit/8057c35d2a89b9d80d31c1da10279c248b3c6e68))
* **wallet-connection:** Connect dapp directly to wallet UI ([#5750](https://github.com/Agoric/agoric-sdk/issues/5750)) ([1dd584b](https://github.com/Agoric/agoric-sdk/commit/1dd584b195212705b1f74a8c89b7f3f121640e41))
* **wallet-ui:** adapt smart wallet proposals ([cef7f34](https://github.com/Agoric/agoric-sdk/commit/cef7f34d6f418bc18155d02b9448a0f378ddc3f9))
* **wallet-ui:** connect to keplr with smart wallet ([#5744](https://github.com/Agoric/agoric-sdk/issues/5744)) ([3482e0d](https://github.com/Agoric/agoric-sdk/commit/3482e0d98748c9b7995c93cbef9a06b0ec0fbea8))
* **wallet-ui:** display set amounts ([#5654](https://github.com/Agoric/agoric-sdk/issues/5654)) ([1945069](https://github.com/Agoric/agoric-sdk/commit/1945069e3e838ecf4cb91a48027bcdcea310d848))
* **wallet-ui:** future-proof for `@agoric/casting`-enabled notifiers ([5eba88a](https://github.com/Agoric/agoric-sdk/commit/5eba88a195d3cd8bbb299d6100f5fbb98a9e4754))
* **wallet-ui:** more robust connection config ui ([#5685](https://github.com/Agoric/agoric-sdk/issues/5685)) ([b1a4c4b](https://github.com/Agoric/agoric-sdk/commit/b1a4c4b9258a8af3a98d6fc281c891229b9a79a4))
* **wallet-ui:** preview mode ([fedf049](https://github.com/Agoric/agoric-sdk/commit/fedf049435d7307311219fbab1b2b342ec6acce8))
* **wallet-ui:** reworking of wallet connections ([f8506f3](https://github.com/Agoric/agoric-sdk/commit/f8506f3c218bd321f35206eab143514bca8f268b))
* **wallet-ui:** start displaying balances ([0f36da9](https://github.com/Agoric/agoric-sdk/commit/0f36da99daef86f24670d606ae5fd1adb32b419b))
* **wallet-ui:** translate proposalTemplate to proposal ([bd91fed](https://github.com/Agoric/agoric-sdk/commit/bd91fede39bf5b430e1b8584e99070fb6ab56254))
* **wallet/ui:** expose netconfig url to dapp bridge ([#5988](https://github.com/Agoric/agoric-sdk/issues/5988)) ([5098751](https://github.com/Agoric/agoric-sdk/commit/5098751d513ec86a912a545f6864deed86eacd20))
* **wallet/ui:** interactive, background signing ([#5877](https://github.com/Agoric/agoric-sdk/issues/5877)) ([e7e6529](https://github.com/Agoric/agoric-sdk/commit/e7e652986cb5410bc09152b8974d6c60cfbb0b28))
* read only smart wallet ([#5741](https://github.com/Agoric/agoric-sdk/issues/5741)) ([9f3745d](https://github.com/Agoric/agoric-sdk/commit/9f3745da424424ff9a2e4c8f7b26bb0de89dd3eb))
* store dapps in localstorage not contract ([#5804](https://github.com/Agoric/agoric-sdk/issues/5804)) ([2fc72d5](https://github.com/Agoric/agoric-sdk/commit/2fc72d5439a7d8e103b15a8afaad2a86c3d455c5))


### Bug Fixes

* **casting:** Align cosmjs deps ([0ba7a1f](https://github.com/Agoric/agoric-sdk/commit/0ba7a1f7a18d4f83afa04b3637f432fdd72f3cd8))
* **wallet-ui:** don't crash if purse not found ([f0b591b](https://github.com/Agoric/agoric-sdk/commit/f0b591bdd2beda96d134bcbee5b3323a7ed40714))
* **wallet-ui:** get offer completion working again ([2e838a0](https://github.com/Agoric/agoric-sdk/commit/2e838a091b77b6f0adb77810c02a5b3f844a9307))
* **wallet-ui:** increase gas allowance ([53eff35](https://github.com/Agoric/agoric-sdk/commit/53eff35ddf01048add0ef7a74f16e45c57406bd6))
* **wallet-ui:** reverse iterate to process all update deltas ([65e681d](https://github.com/Agoric/agoric-sdk/commit/65e681d448a0a65b95837be59322f7298fdfef91))
* ALWAYS default to safe ([#6079](https://github.com/Agoric/agoric-sdk/issues/6079)) ([963b652](https://github.com/Agoric/agoric-sdk/commit/963b652c696e006fb2c4960fe6e36ca49530dd29))
* Remove lockdown unsafe monkey-patching hack ([8c3126d](https://github.com/Agoric/agoric-sdk/commit/8c3126d8301bc2c8f7bb0a2145469f6d9d96b669))
* **wallet:** upgrade for new store coordinator ([51cfc04](https://github.com/Agoric/agoric-sdk/commit/51cfc0462187f7f459016b76a7583e87e0986f14))
* **wallet-ui:** safely render invalid amount values ([#5617](https://github.com/Agoric/agoric-sdk/issues/5617)) ([23f0de1](https://github.com/Agoric/agoric-sdk/commit/23f0de16e2fb858df2f2fb93a8247029c1ab002d))
* **wallet/ui:** change makeFollower to getUnserializer ([#5964](https://github.com/Agoric/agoric-sdk/issues/5964)) ([15179fb](https://github.com/Agoric/agoric-sdk/commit/15179fbabffb9db4588b5301d95014bdf6b9e0fd))
* **wallet/ui:** fix gas price in suggest chain ([21351bd](https://github.com/Agoric/agoric-sdk/commit/21351bd198536624d56235abb34032aca6c7e09e))
* **wallet/ui:** style connection component better ([#5984](https://github.com/Agoric/agoric-sdk/issues/5984)) ([94791c9](https://github.com/Agoric/agoric-sdk/commit/94791c933c678a1f5c8dd43721523db8468d0dd7))
* less unsafe. what breaks? ([#5922](https://github.com/Agoric/agoric-sdk/issues/5922)) ([ace75b8](https://github.com/Agoric/agoric-sdk/commit/ace75b864f93d922477094c464da973125dabf3b))


### Code Refactoring

* **wallet-ui:** remove Solo wallet support ([d952e56](https://github.com/Agoric/agoric-sdk/commit/d952e561e7a6d7396af088a7977d20d8d8ef42f0))



### [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.1.1...@agoric/wallet-ui@0.1.2) (2022-05-28)


### Bug Fixes

* **wallet-ui:** put back missing dapps notifier ([2720247](https://github.com/Agoric/agoric-sdk/commit/272024775e3670b4ead5934a82e9625631e9ea77))
* **wallet-ui:** update state when resetting wallet connection ([eff4186](https://github.com/Agoric/agoric-sdk/commit/eff4186d9b30ff53897f0c683660ea1a3a22949d))



### [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.1.0...@agoric/wallet-ui@0.1.1) (2022-05-09)

**Note:** Version bump only for package @agoric/wallet-ui





## [0.1.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.0.6...@agoric/wallet-ui@0.1.0) (2022-04-18)


### Features

* **wallet-ui:** cheap rendering of offer arguments ([192500d](https://github.com/Agoric/agoric-sdk/commit/192500d019bc482437ed5224a12a76b2488cb23b))


### Bug Fixes

* **wallet-ui:** don't add or strip `board:` prefix ([55d0a0a](https://github.com/Agoric/agoric-sdk/commit/55d0a0a79057a735076630a7c972ea1dbd327f71))



### [0.0.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.0.5...@agoric/wallet-ui@0.0.6) (2022-02-24)

**Note:** Version bump only for package @agoric/wallet-ui





### [0.0.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.0.4...@agoric/wallet-ui@0.0.5) (2022-02-21)


### Features

* example txn ([2cc8a45](https://github.com/Agoric/agoric-sdk/commit/2cc8a45e403f6bdd80566330ddf3f6e4e9477396))
* **wallet:** keplr connection ([259345e](https://github.com/Agoric/agoric-sdk/commit/259345e56c4cd48d3ff6f47da280d5d24b3548ac))
* **wallet-ui:** use new `WalletBackendAdapter` ([4c03015](https://github.com/Agoric/agoric-sdk/commit/4c03015d2cce617b959a0f3105a99d2a29ad65cd))


### Bug Fixes

* **wallet:** dont crash when purses arent loaded before payments ([2965063](https://github.com/Agoric/agoric-sdk/commit/296506378ea6197c74976849bcc54d7c34e34da9))
* use snackbar instead of window.alert ([a233c12](https://github.com/Agoric/agoric-sdk/commit/a233c1269643f201b9214fe132cd4e0d45de3137))
* **solo:** remove a symlink dependency in exchange for web config ([42fc52b](https://github.com/Agoric/agoric-sdk/commit/42fc52b9d7bd8217038164f92f0448c4540c6e64))
* **wallet:** fix crash when deleting dapps ([51f78ae](https://github.com/Agoric/agoric-sdk/commit/51f78ae7a0fcba6a68b68a790d706abea5b6e116))
* **wallet:** fix indefinite loading state ([c58f07d](https://github.com/Agoric/agoric-sdk/commit/c58f07ddd97e6bf06da99284df6eaf2fcb5f2f46))
* **wallet:** fix offer id reference ([#4393](https://github.com/Agoric/agoric-sdk/issues/4393)) ([8c9dae7](https://github.com/Agoric/agoric-sdk/commit/8c9dae71bd3d3bf06d562f38c67dfb46be7db1ca))
* **wallet:** handle cancelled offer state ([#4292](https://github.com/Agoric/agoric-sdk/issues/4292)) ([9dd2dc4](https://github.com/Agoric/agoric-sdk/commit/9dd2dc4f0ed62bed0f6a300dc04c4f0d60d0a65a))
* **wallet-ui:** flatten schema into `actions` and iterators ([21bdfd1](https://github.com/Agoric/agoric-sdk/commit/21bdfd142df0aee91ad19b882a9b8f79a3894e95))



### [0.0.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/wallet-ui@0.0.3...@agoric/wallet-ui@0.0.4) (2021-12-22)


### Features

* **wallet:** add help link to documentation ([977262e](https://github.com/Agoric/agoric-sdk/commit/977262e596259788a773f0fe17eb61fb03d30ea4))


### Bug Fixes

* **wallet:** render issuer brand correctly ([f648c19](https://github.com/Agoric/agoric-sdk/commit/f648c19bbf397e9b322e7b990025157c124d2156))



### 0.0.3 (2021-12-02)

**Note:** Version bump only for package @agoric/wallet-ui





### 0.0.2 (2021-10-13)


### Features

* **react-wallet:** Create app layout with left nav and app bar ([#3941](https://github.com/Agoric/agoric-sdk/issues/3941)) ([18807af](https://github.com/Agoric/agoric-sdk/commit/18807afea158f64eb0241b89cdafde3ec1847f4a))
* **react-wallet:** Integrate wallet connection component ([#3922](https://github.com/Agoric/agoric-sdk/issues/3922)) ([01a9118](https://github.com/Agoric/agoric-sdk/commit/01a91181e36f4e2dc49dcbb1327c50e3b268d2f9))
* **wallet:** Create react ui scaffold with ses ([#3879](https://github.com/Agoric/agoric-sdk/issues/3879)) ([089c876](https://github.com/Agoric/agoric-sdk/commit/089c876d801efc1ede76b3011a1301384aace77f))
