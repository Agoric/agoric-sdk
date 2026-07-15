# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0-u23.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-deploy@0.3.0-u23.0...@aglocal/portfolio-deploy@0.3.0-u23.1) (2026-07-15)

**Note:** Version bump only for package @aglocal/portfolio-deploy

## 0.3.0-u23.0 (2026-04-27)

### ⚠ BREAKING CHANGES

* remove add-auction proposal
* **pola-io:** Remove `flags` helper

### Features

* add accountStateByChain to vstorage ([cf98d80](https://github.com/Agoric/agoric-sdk/commit/cf98d80e62d2e8caf24c27ee012a8e5602c78e0a))
* add claim rewards functions for aave and compound ([25eb411](https://github.com/Agoric/agoric-sdk/commit/25eb4113a20fc6d1a9ae777c290ded8f4d0d14cf))
* add environment-based axelar chain configuration ([39ad0af](https://github.com/Agoric/agoric-sdk/commit/39ad0afb9b0551df57b5ad67c5aef3270239fdb7))
* add protocol for beefy ([e90b59d](https://github.com/Agoric/agoric-sdk/commit/e90b59d9c0b911d71c38054468d063d14396c727))
* add protocols ([19dd899](https://github.com/Agoric/agoric-sdk/commit/19dd899b290d1531deec06d584c865657454194d))
* adding a cctp status to vstorage so it is readable by ymax planner ([8226385](https://github.com/Agoric/agoric-sdk/commit/8226385187c6c146b13fdf0c7e7cf3b5b4f12ff0))
* bump poc token from 24/25 to 26 ([0bb4608](https://github.com/Agoric/agoric-sdk/commit/0bb46081e143a63718c4e781a3844af85a5f033b))
* CCTP tx confirmation handler ([568e80b](https://github.com/Agoric/agoric-sdk/commit/568e80bb627cafebedc0c70d42d01374a803ada4))
* chained proxies for reflectWalletStore ([0155f9f](https://github.com/Agoric/agoric-sdk/commit/0155f9f7353438f63ebfc21e3244246895b42fdf))
* delegate control of ymax0 to a smartWallet ([7f9f480](https://github.com/Agoric/agoric-sdk/commit/7f9f480db87cc5de23beef91eb096f43740224a0))
* deploy funds to aave and compound ([526b4ab](https://github.com/Agoric/agoric-sdk/commit/526b4abfaadeb719155726f3c089b0429a84c852))
* depositFacet awaits provisioning, without namesByAddressAdmin ([64f0ee2](https://github.com/Agoric/agoric-sdk/commit/64f0ee20d56f40c9a73c87811500340fcfc20423))
* EVM Wallet handleMessage ([aecbcfe](https://github.com/Agoric/agoric-sdk/commit/aecbcfea6faa81a32114d9805629066e044902f1))
* pass axelar gmp addresses via privateArgs ([9065bdc](https://github.com/Agoric/agoric-sdk/commit/9065bdc4a400be6722404e01cf3ff88eb3475608))
* **portfolio-contract:** resolve USDC issuer/brand ([d815b4f](https://github.com/Agoric/agoric-sdk/commit/d815b4f9004da9c07ad616f5cc74af842ac80dd0))
* **portfolio-deploy:** add proposal for getUpgradeKit power ([6ab3645](https://github.com/Agoric/agoric-sdk/commit/6ab3645ce5fef956be7c4a14b8e932e5ddb07da2))
* **portfolio-deploy:** add standalone core proposal for deliverContractControl ([764620d](https://github.com/Agoric/agoric-sdk/commit/764620db1aaec9bb47c788d42e1271ddb68b1632))
* **portfolio-deploy:** contract control revoke without terminate ([676aca4](https://github.com/Agoric/agoric-sdk/commit/676aca4408022f0c8e396545f9bf8ecdd302bcd8))
* **portfolio-deploy:** contract control updates stored privateArgs ([8b11219](https://github.com/Agoric/agoric-sdk/commit/8b11219962270188788f8dda5a266b2ae0b49a5a))
* **portfolio-deploy:** core eval to create, distribute PoC token ([c0af0ff](https://github.com/Agoric/agoric-sdk/commit/c0af0ff8dfac6b4dec695e2a6618afa9662c818f))
* **portfolio-deploy:** deployment support for portfolio-contract ([8b13738](https://github.com/Agoric/agoric-sdk/commit/8b137387fd8b45ed6ec291bc716761ad6ba4c5b9))
* **portfolio-deploy:** own core proposal for portfolio-deploy ([acba52a](https://github.com/Agoric/agoric-sdk/commit/acba52af02749d81ab2416d701b5d15f9bbf50c4))
* **portfolio-deploy:** portfolio-control doesn't rely on existing kit ([a4fc12a](https://github.com/Agoric/agoric-sdk/commit/a4fc12a8d3905354b7e75438891c633a14e2c966))
* **portfolio-deploy:** portfolio-control supports contract name ([912086b](https://github.com/Agoric/agoric-sdk/commit/912086bbd6eb2a0e1273874c8356ef93ec9c6aae))
* **portfolio-deploy:** postal service contract ([147c13f](https://github.com/Agoric/agoric-sdk/commit/147c13fb8c766d0d08d8be1f3a9732997b919968))
* **portfolio-deploy:** rework portfolio-control core proposal to use deliverContractControl ([a93041b](https://github.com/Agoric/agoric-sdk/commit/a93041bef57d3421463adb4ac2398bd4703add8b))
* **portfolio-deploy:** split access-token and attenuated-deposit core proposals ([92d62c4](https://github.com/Agoric/agoric-sdk/commit/92d62c4e28a353d31364559326e2469e70ca2c61))
* **portfolio-deploy:** support publishing to vstorage ([573a8a5](https://github.com/Agoric/agoric-sdk/commit/573a8a56822fadbc34e7bef0f6bf657317467c6a))
* **portfolio-deploy:** use getUpgradeKit in portfolio-control ([9cc917c](https://github.com/Agoric/agoric-sdk/commit/9cc917c94f095ed1e3ba54f0d7c893cb50a5a2fc))
* **portfolio:** add evm message handler ([d98663a](https://github.com/Agoric/agoric-sdk/commit/d98663a3f3098d2f2ace1006847005796c6cb54b))
* **portfolio:** contract-control upgrade supports private args overrides ([11585fe](https://github.com/Agoric/agoric-sdk/commit/11585fe7b579c689d85a5be99f3f16fdf62adb1c))
* **portfolio:** implement GMP support for createAndDeposit Factory ([d38388d](https://github.com/Agoric/agoric-sdk/commit/d38388d6f7a2449ff34733af97270ffe10f4d0b0))
* prune old ymax0 vstorage nodes (builder, core-eval) ([9306c33](https://github.com/Agoric/agoric-sdk/commit/9306c33ceff853b412e3fc236c22007976ba8ee1))
* publish axelar chains data on agoricNames ([75f28bc](https://github.com/Agoric/agoric-sdk/commit/75f28bc8df97687761e1fc456bf94bc13b82d024))
* support both router and deposit factory ([88b2349](https://github.com/Agoric/agoric-sdk/commit/88b2349f91072e0841c479780cb72318c44c3d47))
* ymax contract restartable ([0d237a3](https://github.com/Agoric/agoric-sdk/commit/0d237a39cfd8c42978126feb5871f973f3eea53f))
* ymax deployment awaits chainInfoPublished ([6390b4f](https://github.com/Agoric/agoric-sdk/commit/6390b4f2a91b28fd7259af97fc18918e9ead6ee1))

### Bug Fixes

* align vstorage posted data with expected resolver handler status ([#11815](https://github.com/Agoric/agoric-sdk/issues/11815)) ([fea7786](https://github.com/Agoric/agoric-sdk/commit/fea77864ae4355e4d7aa750e3008ad4899949c14)), closes [#11752](https://github.com/Agoric/agoric-sdk/issues/11752)
* ensure unique contract addresses per chain ([69e3649](https://github.com/Agoric/agoric-sdk/commit/69e36494e62bf5774b73f04e91d7519a43bec78b))
* make ethereum value capitalized ([17526bc](https://github.com/Agoric/agoric-sdk/commit/17526bcdea2c940f7bdbe294d7de0b511a749610))
* **portfolio-contract:** cc.terminate() tolerates errors ([e62f09c](https://github.com/Agoric/agoric-sdk/commit/e62f09c50326c03af173532509407b2e7813ade6))
* **portfolio-contract:** rework the `pendingTx` shapes ([5a1388a](https://github.com/Agoric/agoric-sdk/commit/5a1388a00b5dfe8e512c57b9b44acdf3252136ca))
* **portfolio-deploy:** avoid account sequence mismatc ([10af385](https://github.com/Agoric/agoric-sdk/commit/10af38544667ee29bc5648001e3b75073a6333fc))
* **portfolio-deploy:** deploy-cli: show stderr on failure ([2625763](https://github.com/Agoric/agoric-sdk/commit/26257632d117aee4f1eefa33e9d9cdd3b776e6b6))
* **portfolio-deploy:** handle terminated ymax0Kit.instance ([f991a5a](https://github.com/Agoric/agoric-sdk/commit/f991a5a90520733e5333f3180f231e34d34de960))
* **portfolio:** contract-control disallows extra options ([eafcd6c](https://github.com/Agoric/agoric-sdk/commit/eafcd6ce184359c432d7ee577a325a0d0799eb73))
* **portfolio:** remove Access token requirement and add upgrade coverage ([0f6be68](https://github.com/Agoric/agoric-sdk/commit/0f6be687c001c05db573ed86f60c03e865284523))
* use correct flag value for mainnet detection ([bc890e9](https://github.com/Agoric/agoric-sdk/commit/bc890e9dc95b8c6ac881b5e126a29611b84d6d94))

### Miscellaneous Chores

* **pola-io:** Remove `flags` helper ([63eb15a](https://github.com/Agoric/agoric-sdk/commit/63eb15ae9333b6b9d05dad8b1d3c900468bd2473))
* remove add-auction proposal ([1021c42](https://github.com/Agoric/agoric-sdk/commit/1021c429c0da9e7fe08bdb63b07efe9f884f0396))

## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-deploy@0.2.0-u22.2...@aglocal/portfolio-deploy@0.2.0) (2026-04-02)

**Note:** Version bump only for package @aglocal/portfolio-deploy

## [0.2.0-u22.2](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-deploy@0.2.0-u22.1...@aglocal/portfolio-deploy@0.2.0-u22.2) (2025-09-09)

**Note:** Version bump only for package @aglocal/portfolio-deploy

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@aglocal/portfolio-deploy@0.2.0-u22.0...@aglocal/portfolio-deploy@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @aglocal/portfolio-deploy

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
