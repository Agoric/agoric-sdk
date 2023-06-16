# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.5.3](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.5.2...@agoric/smart-wallet@0.5.3) (2023-06-09)

**Note:** Version bump only for package @agoric/smart-wallet





### [0.5.2](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.5.1...@agoric/smart-wallet@0.5.2) (2023-06-02)

**Note:** Version bump only for package @agoric/smart-wallet





### [0.5.1](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.5.0...@agoric/smart-wallet@0.5.1) (2023-05-24)

**Note:** Version bump only for package @agoric/smart-wallet





## [0.5.0](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.4.2...@agoric/smart-wallet@0.5.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* move PublicTopic to Zoe contractSupport
* **wallet:** reject executeOffer on failure
* storage paths by getPublicTopics
* rename 'fit' to 'mustMatch'

### Features

* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric/issues/6822)
* **board-utils:** BoardRemote like Remotables ([3aa44de](https://github.com/Agoric/agoric/commit/3aa44debbdc955892611ba870478fb088395cf10))
* **smartWallet:** fail early on offerId re-use ([08307e0](https://github.com/Agoric/agoric/commit/08307e01a6c9a3d53144df55f52e03f8f9df2a78))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric/issues/7482)
* **contractSupport:** provideAll takes thunks ([f35034b](https://github.com/Agoric/agoric/commit/f35034b13b99dbfb8d472816644e09f9b4f2be3a))
* **contractSupport:** providePublicTopic ([5bdb71e](https://github.com/Agoric/agoric/commit/5bdb71e1af9ecde163322612de3e648fd75d7a47))
* **smart-wallet:** exit offer ([7323023](https://github.com/Agoric/agoric/commit/7323023308aa40c145e60093b7fc52580534cd2d))
* **smart-wallet:** preserve existing `myAddressNameAdmin` ([8f283af](https://github.com/Agoric/agoric/commit/8f283aff0fc7b6146e9b6393c158cd9ca15f31f9))
* **smart-wallet:** publish pending offers before completion ([c913b36](https://github.com/Agoric/agoric/commit/c913b36950be1d2ae1b16d16bfcfc8df32305e0c))
* **smart-wallet:** publish possibly exitable offers ([de0170a](https://github.com/Agoric/agoric/commit/de0170add5bd4c82cbef23431bffaa95f7007880))
* **topics:** makePublicTopic ([c8b464c](https://github.com/Agoric/agoric/commit/c8b464c26c53535097e4df573e126c81e00e5aa6))
* **vats:** Scoped bridge managers ([11f6429](https://github.com/Agoric/agoric/commit/11f64298d8529cca249d2933894236dc534dfe3e))
* **wallet:** executeOffer throw errors ([224dbca](https://github.com/Agoric/agoric/commit/224dbca918343608d53f691a448171c8a48d283e))
* **wallet:** record bridge errors to vstorage ([f8581e9](https://github.com/Agoric/agoric/commit/f8581e95311f7cb4105f6d81f0ac7b6a9121b68f))
* **wallet:** reject executeOffer on failure ([308caab](https://github.com/Agoric/agoric/commit/308caab24c1680c2c7910eff8128f9089dedf26d))
* **walletFactory:** more durability ([7e6c98d](https://github.com/Agoric/agoric/commit/7e6c98d4a448eb94de98c865bc8280534bd5069f))
* **walletFactory:** upgradable ([ca30e05](https://github.com/Agoric/agoric/commit/ca30e05988fae00f437b5708dbabe061742797f1))
* agoricContract invitation getter ([ca6166f](https://github.com/Agoric/agoric/commit/ca6166f94a934811f698631f9ce1dd2a32ad422c))
* allow string for offer id, leave uniqueness to client ([7856e56](https://github.com/Agoric/agoric/commit/7856e5635ba04671da17334080dad061a8f9fc15))
* boot-oracles ([ce8f8de](https://github.com/Agoric/agoric/commit/ce8f8de65ad4c14b4e8d699cd721683cfa1cc495))
* durable smart wallet ([6977f73](https://github.com/Agoric/agoric/commit/6977f73f820a9345ef49f4f18095a5c88af06729))
* fixed heap for getPublicTopics ([1886c3a](https://github.com/Agoric/agoric/commit/1886c3af2319b9540faa318cf6179d4d01eec084))
* storage paths by getPublicTopics ([40a8624](https://github.com/Agoric/agoric/commit/40a8624240f241a686c28bd7d7c7ef1ef780f984))
* support TopicsRecord ([8618461](https://github.com/Agoric/agoric/commit/8618461781fe11f28e6b891a4d31ebfd9dda5e0d))
* track publicSubscribers ([30cae51](https://github.com/Agoric/agoric/commit/30cae513a624a74f2df05b668f4eaa02d6d13656))
* vaults list command ([894c92f](https://github.com/Agoric/agoric/commit/894c92f9ee6331aba43aaeebd6c007dd03d53996))


### Bug Fixes

* handle {} wallet update records ([c7dbccb](https://github.com/Agoric/agoric/commit/c7dbccbad2d2007af398c31c94f68793fe4e8504))
* **cli:** dont blow up from old wallet updates ([ac5a28e](https://github.com/Agoric/agoric/commit/ac5a28e9e47916b0d3ba7978d90067a757470be3))
* **walletFactory:** handle restartContract ([f8b7200](https://github.com/Agoric/agoric/commit/f8b720014c2987301a67d073348b80fc1d30d756))
* Improve the smart wallet revival handshake ([69ec2e7](https://github.com/Agoric/agoric/commit/69ec2e76f06cf87454d087adfa2ef6c2adcea8a0))
* **vats:** Extract revivable wallet addresses from the correct chain storage path ([2454d3f](https://github.com/Agoric/agoric/commit/2454d3f48eefb2bdea5a0d03a250d8a5a74b0ba3))
* add missing facet interface ([d16bc2e](https://github.com/Agoric/agoric/commit/d16bc2e121810c8c432519028e4382146b066956))
* bootstrap handles BundleIDs, not full bundles ([de8b0f5](https://github.com/Agoric/agoric/commit/de8b0f5d35e0938fa00d795d11cfad3acadd9428)), closes [#6826](https://github.com/Agoric/agoric/issues/6826) [#4374](https://github.com/Agoric/agoric/issues/4374)
* number/string inconsistency with offer lookup ([59abbdb](https://github.com/Agoric/agoric/commit/59abbdb0a6498333ec48e971347076f7739c9b84))
* Preserve smart wallets through bulldozer upgrade ([160bf6c](https://github.com/Agoric/agoric/commit/160bf6cad0bbdfe6a245f6b7a8e260d244c44f21)), closes [#7537](https://github.com/Agoric/agoric/issues/7537)
* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **wallet:** pipeTopicToStorage with Recorder kit ([31b79b7](https://github.com/Agoric/agoric/commit/31b79b71eda59b62d3bacd7ca648b53b9385afc0))
* **wallet:** recording handleBridgeAction errors ([8e64158](https://github.com/Agoric/agoric/commit/8e6415872dafc1cd5def9c038d673842464b316b))
* multiple deposits of unknown brand ([6ef6062](https://github.com/Agoric/agoric/commit/6ef6062a4b69b0d44b18dc576021bbbaf372b3b2))
* purse making (use vbank) ([9175882](https://github.com/Agoric/agoric/commit/91758824848ea24f5cd4cae5eaadf88169b80e39))
* race in watchPurse to update balance ([51869c1](https://github.com/Agoric/agoric/commit/51869c1ffce90350cbaed84b5f92fa05c3473f3e))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* **smart-wallet:** create purses for new assets lazily ([e241ba0](https://github.com/Agoric/agoric/commit/e241ba03a7d9f441436b3d987f9327060d7dd8ce))


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric/issues/6844)


### Code Refactoring

* move PublicTopic to Zoe contractSupport ([c51ea3d](https://github.com/Agoric/agoric/commit/c51ea3de22f50e05fcc1aaabd2108e785d51eb2e))



### [0.4.4](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.4.3...@agoric/smart-wallet@0.4.4) (2023-02-17)

**Note:** Version bump only for package @agoric/smart-wallet





### [0.4.3](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.4.2...@agoric/smart-wallet@0.4.3) (2022-12-14)

**Note:** Version bump only for package @agoric/smart-wallet





### [0.4.2](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.4.1...@agoric/smart-wallet@0.4.2) (2022-10-18)

**Note:** Version bump only for package @agoric/smart-wallet





### [0.4.1](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.4.0...@agoric/smart-wallet@0.4.1) (2022-10-08)

**Note:** Version bump only for package @agoric/smart-wallet





## [0.4.0](https://github.com/Agoric/agoric/compare/@agoric/smart-wallet@0.3.0...@agoric/smart-wallet@0.4.0) (2022-10-05)


### Features

* **cli:** use new wallet.current node ([71effe7](https://github.com/Agoric/agoric/commit/71effe758c28181b8709ae4ccf025fcec7bb8a38))
* track consumed invitation amounts ([e9e3c35](https://github.com/Agoric/agoric/commit/e9e3c35cebdc85e80fb2eaa117ff0be00d26c9bb))
* **cli:** show status of invitations ([8506e6d](https://github.com/Agoric/agoric/commit/8506e6d87ef331e781c9d2e2251fdcf48e784e04))


### Bug Fixes

* **vats:** handle duplicate provision requests ([#6307](https://github.com/Agoric/agoric/issues/6307)) ([05d405d](https://github.com/Agoric/agoric/commit/05d405d5409e1f80612bb002234f5a9c3910a7df))
* **wallet-ui:** detect unprovisioned wallet ([1747d57](https://github.com/Agoric/agoric/commit/1747d5781f4ee594eca1ded76af4944c405e7000))



## 0.3.0 (2022-09-20)


### Features

* **wallet:** more diagnostics for invitation match ([98630ee](https://github.com/Agoric/agoric/commit/98630ee96a202cf3907e37b5d4d549bb37b1263d))
* **wallet-ui:** start displaying balances ([0f36da9](https://github.com/Agoric/agoric/commit/0f36da99daef86f24670d606ae5fd1adb32b419b))
* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* **smart-wallet:** include lastOfferId in error ([932cb7d](https://github.com/Agoric/agoric/commit/932cb7d90b8e281f0922d0b38287230aabd6f535))
* **smartWallet:** defer deposits until purse available ([#6172](https://github.com/Agoric/agoric/issues/6172)) ([1a1cc41](https://github.com/Agoric/agoric/commit/1a1cc41d421760563892212e1ca3df237a7a6661))
* **smartWallet:** virtual objects ([659ad58](https://github.com/Agoric/agoric/commit/659ad58349f972881a540d78ec5d856872dacc7d))
* distribute PSM Charter Invitatitons ([#6166](https://github.com/Agoric/agoric/issues/6166)) ([50cd3e2](https://github.com/Agoric/agoric/commit/50cd3e240fb33079948fa03b32bda86276879b4a))
* new Smart Wallet ([708972f](https://github.com/Agoric/agoric/commit/708972f1f531c9ea5e346f833c6d253efe80f837))


### Bug Fixes

* **smart-wallet:** invitation brand is remote ([6613136](https://github.com/Agoric/agoric/commit/66131366f563ebfefbeabeecffda43211a093d1e))
* **smart-wallet:** not yet durable-able ([db66c2c](https://github.com/Agoric/agoric/commit/db66c2c13de92f2a0783bcaf174223691ab0a339))
* Fix test failures in packages other than "vats" ([364815b](https://github.com/Agoric/agoric/commit/364815b88429e3443734681b5b0771b7d824ebe8))
* two corrections we found by demoing on 6084 ([#6155](https://github.com/Agoric/agoric/issues/6155)) ([88b1067](https://github.com/Agoric/agoric/commit/88b10676b9617e662fed38df61ab3210df07c602))
