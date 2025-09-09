# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## 0.2.0-u22.0 (2025-09-08)

### ⚠ BREAKING CHANGES

* **pola-io:** Remove `flags` helper

### Features

* add claim rewards functions for aave and compound ([25eb411](https://github.com/Agoric/agoric-sdk/commit/25eb4113a20fc6d1a9ae777c290ded8f4d0d14cf))
* add environment-based axelar chain configuration ([39ad0af](https://github.com/Agoric/agoric-sdk/commit/39ad0afb9b0551df57b5ad67c5aef3270239fdb7))
* add protocol for beefy ([e90b59d](https://github.com/Agoric/agoric-sdk/commit/e90b59d9c0b911d71c38054468d063d14396c727))
* adding a cctp status to vstorage so it is readable by ymax planner ([8226385](https://github.com/Agoric/agoric-sdk/commit/8226385187c6c146b13fdf0c7e7cf3b5b4f12ff0))
* bump poc token from 24/25 to 26 ([0bb4608](https://github.com/Agoric/agoric-sdk/commit/0bb46081e143a63718c4e781a3844af85a5f033b))
* CCTP tx confirmation handler ([568e80b](https://github.com/Agoric/agoric-sdk/commit/568e80bb627cafebedc0c70d42d01374a803ada4))
* delegate control of ymax0 to a smartWallet ([7f9f480](https://github.com/Agoric/agoric-sdk/commit/7f9f480db87cc5de23beef91eb096f43740224a0))
* deploy funds to aave and compound ([526b4ab](https://github.com/Agoric/agoric-sdk/commit/526b4abfaadeb719155726f3c089b0429a84c852))
* depositFacet awaits provisioning, without namesByAddressAdmin ([64f0ee2](https://github.com/Agoric/agoric-sdk/commit/64f0ee20d56f40c9a73c87811500340fcfc20423))
* pass axelar gmp addresses via privateArgs ([9065bdc](https://github.com/Agoric/agoric-sdk/commit/9065bdc4a400be6722404e01cf3ff88eb3475608))
* **portfolio-contract:** resolve USDC issuer/brand ([d815b4f](https://github.com/Agoric/agoric-sdk/commit/d815b4f9004da9c07ad616f5cc74af842ac80dd0))
* **portfolio-deploy:** core eval to create, distribute PoC token ([c0af0ff](https://github.com/Agoric/agoric-sdk/commit/c0af0ff8dfac6b4dec695e2a6618afa9662c818f))
* **portfolio-deploy:** deployment support for portfolio-contract ([8b13738](https://github.com/Agoric/agoric-sdk/commit/8b137387fd8b45ed6ec291bc716761ad6ba4c5b9))
* **portfolio-deploy:** postal service contract ([147c13f](https://github.com/Agoric/agoric-sdk/commit/147c13fb8c766d0d08d8be1f3a9732997b919968))
* **portfolio-deploy:** support publishing to vstorage ([573a8a5](https://github.com/Agoric/agoric-sdk/commit/573a8a56822fadbc34e7bef0f6bf657317467c6a))
* prune old ymax0 vstorage nodes (builder, core-eval) ([9306c33](https://github.com/Agoric/agoric-sdk/commit/9306c33ceff853b412e3fc236c22007976ba8ee1))
* publish axelar chains data on agoricNames ([75f28bc](https://github.com/Agoric/agoric-sdk/commit/75f28bc8df97687761e1fc456bf94bc13b82d024))
* ymax contract restartable ([0d237a3](https://github.com/Agoric/agoric-sdk/commit/0d237a39cfd8c42978126feb5871f973f3eea53f))
* ymax deployment awaits chainInfoPublished ([6390b4f](https://github.com/Agoric/agoric-sdk/commit/6390b4f2a91b28fd7259af97fc18918e9ead6ee1))

### Bug Fixes

* align vstorage posted data with expected resolver handler status ([#11815](https://github.com/Agoric/agoric-sdk/issues/11815)) ([fea7786](https://github.com/Agoric/agoric-sdk/commit/fea77864ae4355e4d7aa750e3008ad4899949c14)), closes [#11752](https://github.com/Agoric/agoric-sdk/issues/11752)
* ensure unique contract addresses per chain ([69e3649](https://github.com/Agoric/agoric-sdk/commit/69e36494e62bf5774b73f04e91d7519a43bec78b))
* make ethereum value capitalized ([17526bc](https://github.com/Agoric/agoric-sdk/commit/17526bcdea2c940f7bdbe294d7de0b511a749610))
* **portfolio-contract:** cc.terminate() tolerates errors ([e62f09c](https://github.com/Agoric/agoric-sdk/commit/e62f09c50326c03af173532509407b2e7813ade6))
* **portfolio-deploy:** avoid account sequence mismatc ([10af385](https://github.com/Agoric/agoric-sdk/commit/10af38544667ee29bc5648001e3b75073a6333fc))
* **portfolio-deploy:** handle terminated ymax0Kit.instance ([f991a5a](https://github.com/Agoric/agoric-sdk/commit/f991a5a90520733e5333f3180f231e34d34de960))

### Miscellaneous Chores

* **pola-io:** Remove `flags` helper ([63eb15a](https://github.com/Agoric/agoric-sdk/commit/63eb15ae9333b6b9d05dad8b1d3c900468bd2473))
