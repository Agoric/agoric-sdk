# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.2...@agoric/inter-protocol@0.13.3) (2023-02-17)

**Note:** Version bump only for package @agoric/inter-protocol





### [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.1...@agoric/inter-protocol@0.13.2) (2022-12-14)

**Note:** Version bump only for package @agoric/inter-protocol





### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.13.0...@agoric/inter-protocol@0.13.1) (2022-10-18)

**Note:** Version bump only for package @agoric/inter-protocol





## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.12.1...@agoric/inter-protocol@0.13.0) (2022-10-08)


### Features

* script to replace econ-gov in Core Eval ([8bcebf9](https://github.com/Agoric/agoric-sdk/commit/8bcebf95d6f93fe094bdfeab41b4bedec1ac9662))
* **governance:** replaceElectorate ([12de09e](https://github.com/Agoric/agoric-sdk/commit/12de09e03a6f52c77f2453a006164f151a2c13af))


### Bug Fixes

* strike "Initial" from Economic Committee ([0f3ce16](https://github.com/Agoric/agoric-sdk/commit/0f3ce1695635551b800f04e0e232d25e16c8f562))



### [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/inter-protocol@0.12.0...@agoric/inter-protocol@0.12.1) (2022-10-05)


### Bug Fixes

* make it possible to set decimalPlaces when calling startPSM ([#6348](https://github.com/Agoric/agoric-sdk/issues/6348)) ([46aa80e](https://github.com/Agoric/agoric-sdk/commit/46aa80e1f8d8a73a8a7853ebcd937f5c2df64a42))



## 0.12.0 (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **psm:** split PSM invitations to enable pausing separately (#6030)
* **store:** move some util where they are more reusable (#5990)
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment)
* **vaultFactory:** split numVaults to numActiveVaults and numLiquidatingVaults (#5917)
* **startPSM:** IST → RUN
* **run-protocol:** rename to inter-protocol

### Features

* **zoe:** expose keywords in error messages ([3c9c497](https://github.com/Agoric/agoric-sdk/commit/3c9c497b0c22bf9729cc65af26a0d6a32450a4fd))
* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric-sdk/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric-sdk/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* **inter-protocol:** introduce each PSM to the provisionPool ([3b53b9b](https://github.com/Agoric/agoric-sdk/commit/3b53b9b406ea33136fda9a5292def20f7143c7c5))
* add a continuing invitation to the voter facet ([#6092](https://github.com/Agoric/agoric-sdk/issues/6092)) ([f53470e](https://github.com/Agoric/agoric-sdk/commit/f53470ede1e58e6aebc1c4db7da4c8ecefa8b46f))
* distribute PSM Charter Invitatitons ([#6166](https://github.com/Agoric/agoric-sdk/issues/6166)) ([50cd3e2](https://github.com/Agoric/agoric-sdk/commit/50cd3e240fb33079948fa03b32bda86276879b4a))
* make PSM bootstrap support multiple brands ([#6146](https://github.com/Agoric/agoric-sdk/issues/6146)) ([d9583f8](https://github.com/Agoric/agoric-sdk/commit/d9583f88fe98eaa16b5d5147f33a99f0722453e1)), closes [#6142](https://github.com/Agoric/agoric-sdk/issues/6142) [#6139](https://github.com/Agoric/agoric-sdk/issues/6139)
* **amm:** new storageNode 'init' for immutables ([a482f82](https://github.com/Agoric/agoric-sdk/commit/a482f82f7cbe93f0ce4125c6e03eeda577322d23))
* **bootstrap:** produce testFirstAnchorKit ([219f6fd](https://github.com/Agoric/agoric-sdk/commit/219f6fd3f8fd0fe89372115ad13f4b5e531fba61))
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment) ([cc4ca9a](https://github.com/Agoric/agoric-sdk/commit/cc4ca9a51665e2d4980ade3f3803655c43ac7001))
* **inter:** board ids for STABLE ([5160b3c](https://github.com/Agoric/agoric-sdk/commit/5160b3c80c7998441edc5e90a7a1f9b65160a147))
* **liquidation:** If liquidation results in a shortfall, don't refund excess ([#5919](https://github.com/Agoric/agoric-sdk/issues/5919)) ([2e91d96](https://github.com/Agoric/agoric-sdk/commit/2e91d967ef66ea73786ddd0c181a842303f892bd))
* **psm:** far class and guard patterns ([#6119](https://github.com/Agoric/agoric-sdk/issues/6119)) ([11a17d3](https://github.com/Agoric/agoric-sdk/commit/11a17d3cf006cb097d80061234398021109dbd94)), closes [#6129](https://github.com/Agoric/agoric-sdk/issues/6129) [#6135](https://github.com/Agoric/agoric-sdk/issues/6135)
* charter for the PSM, enabling governance ([#6090](https://github.com/Agoric/agoric-sdk/issues/6090)) ([e80b763](https://github.com/Agoric/agoric-sdk/commit/e80b7639e45647d54873c5d24ab9e98bd47b9679))
* save PSM adminFacet in bootstrap ([#6101](https://github.com/Agoric/agoric-sdk/issues/6101)) ([14b20e6](https://github.com/Agoric/agoric-sdk/commit/14b20e6054703240754695ba3ba385d0e954d41c))
* **governance:** questions to off-chain storage ([5bf276b](https://github.com/Agoric/agoric-sdk/commit/5bf276b79d062c05a43666f4fc8622c177b53d2f))
* **inter-protocol:** add amm liquidity script ([#5938](https://github.com/Agoric/agoric-sdk/issues/5938)) ([d0f0f7a](https://github.com/Agoric/agoric-sdk/commit/d0f0f7a76b55291f6bd1cec4f95bfae72496dbc4))
* **inter-protocol:** support committee question publishing ([91dec79](https://github.com/Agoric/agoric-sdk/commit/91dec791d7c77c6a92263951ffbb0aaa7c7ebfbe))
* **priceAggregator:** publish quotes ([d4054d9](https://github.com/Agoric/agoric-sdk/commit/d4054d98bd5a094b45ed2e3e70bb1ff997f4b2c5))
* **psm:** metrics to off-chain storage ([6a5d862](https://github.com/Agoric/agoric-sdk/commit/6a5d862a91daed8f626d8c594c1dff7b8c306062))
* **run-protocol:** calculateCurrentDebt util ([ce2c5e8](https://github.com/Agoric/agoric-sdk/commit/ce2c5e89301775df2b9e3d26e662a80f96ba424f))
* **vats:** makeMockChainStorageRoot test util ([7e48be3](https://github.com/Agoric/agoric-sdk/commit/7e48be3ae25b1dcc77b729e890d5792d8ff36c01))
* **vaultFactory:** split numVaults to numActiveVaults and numLiquidatingVaults ([#5917](https://github.com/Agoric/agoric-sdk/issues/5917)) ([9b20d03](https://github.com/Agoric/agoric-sdk/commit/9b20d0328dc73a9541492f4f87221b3fe8b6a395))
* **zoe:** unitAmount helper ([9007f4c](https://github.com/Agoric/agoric-sdk/commit/9007f4c5710f65566842559680f7a0557f57398d))


### Bug Fixes

* **psm:** "mint" limits for IST rather than anchor ([413c104](https://github.com/Agoric/agoric-sdk/commit/413c104436d7a9d725c99463ed7c2fe385c8d2fc))
* **psm:** fully integrate mintedPoolBalance ([9d6d724](https://github.com/Agoric/agoric-sdk/commit/9d6d7243d185fec0a9d6467ac0500f86e8bb9547))
* **psmCharter:** ParamChangesOfferArgsShape path ([c113ff0](https://github.com/Agoric/agoric-sdk/commit/c113ff09d6008d93f72840c1fad525cba97b32a7))
* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* better mismatch errors ([#5947](https://github.com/Agoric/agoric-sdk/issues/5947)) ([46e34f6](https://github.com/Agoric/agoric-sdk/commit/46e34f6deb7e5d8210a227bdea32fe3e2296e9ef))
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* bug in M.setOf and M.bagOf ([#5952](https://github.com/Agoric/agoric-sdk/issues/5952)) ([c940736](https://github.com/Agoric/agoric-sdk/commit/c940736dae49a1d3095194839dae355d4db2a67f))
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* Fix test failures in packages other than "vats" ([364815b](https://github.com/Agoric/agoric-sdk/commit/364815b88429e3443734681b5b0771b7d824ebe8))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* psmCharter.addInstance interface shape correction ([00e631d](https://github.com/Agoric/agoric-sdk/commit/00e631de2b54f84343024aa78b06a5f27f9689ac))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **inter-protocol:** ensure PSM availability after failure ([7f0f8fd](https://github.com/Agoric/agoric-sdk/commit/7f0f8fdfebe8c843ee0b40f2b88717ab680c2354))
* **inter-protocol:** introduce each PSM to the psmCharter ([48be0f8](https://github.com/Agoric/agoric-sdk/commit/48be0f8ce62edc6c14164e8dfb67cf955e7366cd))
* rewrite zoe/tools/manualTimer.js, update tests ([0b5df16](https://github.com/Agoric/agoric-sdk/commit/0b5df16f83629efb7cb48d54250139e082ed109c))
* **inter-protocol:** settle issuers before adding to agoricNames ([2d21478](https://github.com/Agoric/agoric-sdk/commit/2d21478c02d551227c887d69621f2205ef6f3f48))
* **startPSM:** IST → RUN ([20fb445](https://github.com/Agoric/agoric-sdk/commit/20fb445b5e6ef56b781531f1ae050fbd7ca16e36))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* time as branded value ([#5821](https://github.com/Agoric/agoric-sdk/issues/5821)) ([34078ff](https://github.com/Agoric/agoric-sdk/commit/34078ff4b34a498f96f3cb83df3a0b930b98bbec))
* userSeat allocation only for testing ([#5826](https://github.com/Agoric/agoric-sdk/issues/5826)) ([9cb561b](https://github.com/Agoric/agoric-sdk/commit/9cb561b39d56cc54e87258980d333d912e837f38))
* **vault:** move outerUpdater out of durable state ([3fa2e58](https://github.com/Agoric/agoric-sdk/commit/3fa2e588911c877d9e463cf860215c6f91a32d2f))
* **vault:** zcf non-durable ([b74cdc6](https://github.com/Agoric/agoric-sdk/commit/b74cdc6220ceaf5f16289898bcde74637eabe8d0))


### Code Refactoring

* **psm:** split PSM invitations to enable pausing separately ([#6030](https://github.com/Agoric/agoric-sdk/issues/6030)) ([45bc8a1](https://github.com/Agoric/agoric-sdk/commit/45bc8a1896c5f51b6fb41863b50fd16c18cfcdff))
* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))
* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



## [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.10.0...@agoric/run-protocol@0.11.0) (2022-05-28)


### ⚠ BREAKING CHANGES

* **amm:** push reserved assets to reserve contract (#5429)
* **AMM:** make amm.addPool() require minimum collateral (#5377)

### Features

* **amm:** push reserved assets to reserve contract ([#5429](https://github.com/Agoric/agoric-sdk/issues/5429)) ([20472a1](https://github.com/Agoric/agoric-sdk/commit/20472a1924352df1611ed408c420ac0c56457fc7))
* **AMM:** make amm.addPool() require minimum collateral ([#5377](https://github.com/Agoric/agoric-sdk/issues/5377)) ([2fedea6](https://github.com/Agoric/agoric-sdk/commit/2fedea666d6730c852aee49c045449aa5d8bebb5)), closes [#4643](https://github.com/Agoric/agoric-sdk/issues/4643) [#5397](https://github.com/Agoric/agoric-sdk/issues/5397)
* **core-proposal:** provide an `overrideManifest` to make the manifest explicit ([6557ecf](https://github.com/Agoric/agoric-sdk/commit/6557ecfb965fd668cf9538132e63a0419b86bd54))
* **feeDistributor:** new `run-protocol` Zoe contract ([b5d9869](https://github.com/Agoric/agoric-sdk/commit/b5d9869049e42319d8df529bc274e487e77493ad))
* **liquidation:** push penalties to reserve ([b431916](https://github.com/Agoric/agoric-sdk/commit/b43191627cee20c5631fffc5786807b01673fc20))
* **reserve:** always accept RUN ([f803755](https://github.com/Agoric/agoric-sdk/commit/f80375584953d591ec39b7370fbb3f386e6d6d12))
* **Reserve:** Reserve can burn RUN  to reduce shortfall ([#5444](https://github.com/Agoric/agoric-sdk/issues/5444)) ([1f75135](https://github.com/Agoric/agoric-sdk/commit/1f75135b16893a2efacc6bb23011a5e910489ccf))
* **run-protocol:** support $MIN_INITIAL_POOL_LIQUIDITY esp 0 ([1507ed6](https://github.com/Agoric/agoric-sdk/commit/1507ed6857029dbe8e96df8d7d14773e0f8ccacc))
* Reserves track liquidation shortfall ([#5431](https://github.com/Agoric/agoric-sdk/issues/5431)) ([1d8093d](https://github.com/Agoric/agoric-sdk/commit/1d8093dd426b4ca6cf71a94c71b6f9599eefe532))
* **cosmic-swingset:** implement `make scenario2-run-chain-economy` ([82a6ee9](https://github.com/Agoric/agoric-sdk/commit/82a6ee9edba0eec562e12bd325b893010ddb94ce))
* **run-protocol:** add `scripts/manual-price-feed.js` ([8f3da47](https://github.com/Agoric/agoric-sdk/commit/8f3da47fac23ba947a5fac196ce14fd0d57b89d2))
* **run-protocol:** fix committee-proposal.js ([ef9a1f6](https://github.com/Agoric/agoric-sdk/commit/ef9a1f646a627d06a20ffe2baf3b1f8ac81533c8))
* **run-protocol:** have behaviours allow more customisation ([761661d](https://github.com/Agoric/agoric-sdk/commit/761661d2722e111f207eea5179cd43ee971a5289))
* **run-protocol:** price feed core and proposal ([4b96bb6](https://github.com/Agoric/agoric-sdk/commit/4b96bb686fea8959ee9d34517eb59594063cdf59))
* **run-protocol:** restructure core-proposals ([4e902a6](https://github.com/Agoric/agoric-sdk/commit/4e902a6a16f5780afea49a14e13116a1a7583a1c))
* **run-protocol:** support core-proposal args ([d3d8927](https://github.com/Agoric/agoric-sdk/commit/d3d8927e1a8155176c8da8ea2bf96b20ce8d91ff))
* **vats:** separate reserve and reward streams ([8303c97](https://github.com/Agoric/agoric-sdk/commit/8303c9750b7ea2e3c455d0ba155d806563507bbc))
* **vault:** econ metrics notifiers ([#5260](https://github.com/Agoric/agoric-sdk/issues/5260)) ([6c3cdf3](https://github.com/Agoric/agoric-sdk/commit/6c3cdf37234c3053f7dfcd745e21ae78d828ad0b))
* **vault:** liquidation penalty handled by liquidation contracts ([#5343](https://github.com/Agoric/agoric-sdk/issues/5343)) ([ce1cfaf](https://github.com/Agoric/agoric-sdk/commit/ce1cfafb6d375453865062e1bd66ade66fb80686))
* **vaultManager:** expose liquidation metrics ([#5393](https://github.com/Agoric/agoric-sdk/issues/5393)) ([47d4823](https://github.com/Agoric/agoric-sdk/commit/47d48236ee1702d8b0a903e39143132b56cfd096))
* permissionless interchain AMM pool creation ([5e2a8d0](https://github.com/Agoric/agoric-sdk/commit/5e2a8d09403e237b832ab4a26419e219f3f51969))
* publish econ stats from AMM ([#5420](https://github.com/Agoric/agoric-sdk/issues/5420)) ([87a9e62](https://github.com/Agoric/agoric-sdk/commit/87a9e628315948fa75e78bf5294178f65bc34b56)), closes [#4648](https://github.com/Agoric/agoric-sdk/issues/4648) [#5377](https://github.com/Agoric/agoric-sdk/issues/5377)


### Bug Fixes

* **addAssetToVault:** dangling promises ([d37dd78](https://github.com/Agoric/agoric-sdk/commit/d37dd7846f1258ffba291b6a9cbc94fb01e95e16))
* **addAssetToVault:** use unit values to generate the scaling ratios ([7259bbe](https://github.com/Agoric/agoric-sdk/commit/7259bbe7e07e61ec946401940e172e786e88ebf1))
* **amm:** don't require {want:{Liquidity}} when adding liquidity ([e768c91](https://github.com/Agoric/agoric-sdk/commit/e768c91b834377018fafea150150d2c122358baa))
* **amm:** update metrics whenever pool balances change, including init ([001280b](https://github.com/Agoric/agoric-sdk/commit/001280b7d9d8aeb0af17ba590cdde8ff6932ef6f))
* **AMM:** await zcf.saveIssuer() ([03b597e](https://github.com/Agoric/agoric-sdk/commit/03b597e17d9e185e289e067a83b31248daee6081))
* **interchainPool:** get MinInitialLiquidity from AMM on demand ([#5423](https://github.com/Agoric/agoric-sdk/issues/5423)) ([1f849a3](https://github.com/Agoric/agoric-sdk/commit/1f849a3edece3883dd03548825f744af6d00b686))
* **run-protocol:** adapt startPSM to core proposal conventions ([4e47405](https://github.com/Agoric/agoric-sdk/commit/4e474050d42727a2527026251fa40dd35a0db105))
* **run-protocol:** raise demo issuer debt limit ([129826c](https://github.com/Agoric/agoric-sdk/commit/129826c3a14021292227993a28012c1ce41fd146))
* **run-protocol:** reinstate option to publish interchain asset from bank ([0672139](https://github.com/Agoric/agoric-sdk/commit/0672139619cf9e3ef4007700e9e05c82e742e0c5))
* vault proposal relies on permissionless IBC AMM pool creation ([4e711b1](https://github.com/Agoric/agoric-sdk/commit/4e711b1e6009e02bd2e4e642d8c39158182336a7))



## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.9.0...@agoric/run-protocol@0.10.0) (2022-05-09)


### ⚠ BREAKING CHANGES

* impose a minimum loan size when opening a vault (#5235)

### Features

* extract committee invitation as deploy script ([7d52883](https://github.com/Agoric/agoric-sdk/commit/7d52883844af1a41a0b1095a290069de1470f4f5))
* **bundleTool:** makeNodeBundleCache uses explicit authority ([bbb7e02](https://github.com/Agoric/agoric-sdk/commit/bbb7e02d34c59e2a8c7f743a2ca28727da5bc67e))
* **run-protocol:** gov-inviteCommittee.js for agoricdev-10 ([af21f22](https://github.com/Agoric/agoric-sdk/commit/af21f22e8e7c1649b13661312a58de54d51d11fa))
* add a contract that supports voting on economic contracts ([e3f77ef](https://github.com/Agoric/agoric-sdk/commit/e3f77ef788d7c85d55e07adfd52f24158d0eec85))
* impose a minimum loan size when opening a vault ([#5235](https://github.com/Agoric/agoric-sdk/issues/5235)) ([4a2edd3](https://github.com/Agoric/agoric-sdk/commit/4a2edd32b187604e11a1b530e6e5703994813017)), closes [#4967](https://github.com/Agoric/agoric-sdk/issues/4967)
* **amm:** support `maxOut` optional arg to `swap` ([#5125](https://github.com/Agoric/agoric-sdk/issues/5125)) ([54151ac](https://github.com/Agoric/agoric-sdk/commit/54151ac5aa468abedae0b535d35df3535c4ad727))
* **psm:** governance ([086674c](https://github.com/Agoric/agoric-sdk/commit/086674c28b607f344e22c8df5a82ff46a3255622))
* **run-protocol:** collect runStake fees ([#5197](https://github.com/Agoric/agoric-sdk/issues/5197)) ([ac1b9c8](https://github.com/Agoric/agoric-sdk/commit/ac1b9c8418cf603d96f498aac199c21686d4672d))
* **run-protocol:** convert RunStakeManager to vobj ([#5135](https://github.com/Agoric/agoric-sdk/issues/5135)) ([6b912b4](https://github.com/Agoric/agoric-sdk/commit/6b912b4f1f96a0b22e776246e232cc1a61d6d60a)), closes [#5106](https://github.com/Agoric/agoric-sdk/issues/5106)
* **run-protocol:** runStake, PSM bootstrap ([2c98994](https://github.com/Agoric/agoric-sdk/commit/2c98994819bc7947ffbfb5318050f371e10e2ea4))
* **vault:** governance upgrade of liquidation ([#5211](https://github.com/Agoric/agoric-sdk/issues/5211)) ([35e1b7d](https://github.com/Agoric/agoric-sdk/commit/35e1b7d0b7df2508adf0d46a83944e94ab95951a))
* **vault:** Liquidate incrementally ([#5129](https://github.com/Agoric/agoric-sdk/issues/5129)) ([b641269](https://github.com/Agoric/agoric-sdk/commit/b64126996d4844c07016deadc87269dc387c4aae))
* virtualize pools for the AMM. ([#5187](https://github.com/Agoric/agoric-sdk/issues/5187)) ([e2338e9](https://github.com/Agoric/agoric-sdk/commit/e2338e98b64b59920a13faeacb29ae7868c3693b))


### Bug Fixes

* **econCommitteeCharter:** missing deadline param ([1669588](https://github.com/Agoric/agoric-sdk/commit/1669588d96929b5b6e427affcf30b51a882f47c4))
* **extract-proposal:** coreProposal source paths were leaked onto the chain ([acc6672](https://github.com/Agoric/agoric-sdk/commit/acc66729cfa8459ef549b96f6fbeed1d55a4be3f))
* addPool takes an issuer ([9a9eb43](https://github.com/Agoric/agoric-sdk/commit/9a9eb436007b83adb3a18551d9d7510b9be91ecc))
* typo in invite-committee-core.js ([ebbb3ff](https://github.com/Agoric/agoric-sdk/commit/ebbb3ff64d89cd34a7e30324be2af7b15eb23ef6))
* **attestation:** handle return of empty attestation ([11164bb](https://github.com/Agoric/agoric-sdk/commit/11164bbe8695825bcadcf09bba3bb59114256a41))
* **bundleTool:** don't ignore module path in metadata check ([#5199](https://github.com/Agoric/agoric-sdk/issues/5199)) ([540978c](https://github.com/Agoric/agoric-sdk/commit/540978c997e30c25905ea1fb837ae701db6f3536)), closes [#5129](https://github.com/Agoric/agoric-sdk/issues/5129) [/github.com/Agoric/agoric-sdk/pull/5129/commits/00d32a7e84d8d4fd9309a1e115145d5164c93b19#r854207585](https://github.com/Agoric//github.com/Agoric/agoric-sdk/pull/5129/commits/00d32a7e84d8d4fd9309a1e115145d5164c93b19/issues/r854207585)
* **run-protocol:** complete permits for startRewardDistributor, makeAnchorAsset ([#5213](https://github.com/Agoric/agoric-sdk/issues/5213)) ([2b2c966](https://github.com/Agoric/agoric-sdk/commit/2b2c9666f5cb51f584ab04f187aa12c03f415437))
* **run-protocol:** PSM governance, anchor mintHolder ([cb8f68b](https://github.com/Agoric/agoric-sdk/commit/cb8f68b10c0351c6d5d04a06cd31a4fefb0e5043))
* **run-protocol:** restore wrapLienedAmount on AttestationTool ([1445997](https://github.com/Agoric/agoric-sdk/commit/14459974e7b78f646b792bc7c5033cba5c6ed31c))
* reconcile use of path to paramManager vaults with others ([#5151](https://github.com/Agoric/agoric-sdk/issues/5151)) ([b5d1439](https://github.com/Agoric/agoric-sdk/commit/b5d14393d407a7d7dca42ff5e41d374613168cbc))
* **run-protocol:** vault debt ratio ordering after interest charges ([#5149](https://github.com/Agoric/agoric-sdk/issues/5149)) ([2c9a5d0](https://github.com/Agoric/agoric-sdk/commit/2c9a5d0e07b0886ba6cbfd38ec6d321f1e42a4fb))



## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.8.0...@agoric/run-protocol@0.9.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* atomically update multiple parameters via governance (#5063)
* fix a bug in addLiquidity (#5091)
* add collateral Reserve to hold collateral and add to AMM under governance control (#4635)
* add the ability to invoke an API to contract governance (#4869)
* **run-protocol:** vaults hold liquidation proceeds until closed
* **run-protocol:** return assetNotifier instead of notifying on uiNotifier
* **run-protocol:** rename uiNotifier to vaultNotifier
* consistent Node engine requirement (>=14.15.0)
* **run-protocol:** remove liquidated flag from vault notifications

### Features

* **bundleTool:** memoize load() ([9624665](https://github.com/Agoric/agoric-sdk/commit/96246659ebe9baef4fbabb02ffe3e74210428537))
* **run-protocol:** charge penalty for liquidation ([#4996](https://github.com/Agoric/agoric-sdk/issues/4996)) ([5467be4](https://github.com/Agoric/agoric-sdk/commit/5467be4fb5c4cc47f34736eb669e207b26eb711d))
* **run-protocol:** debt limit for RUNstake ([c6a2b68](https://github.com/Agoric/agoric-sdk/commit/c6a2b6825c40b94e03a2bd5c34be7aad473e54a6))
* **run-protocol:** debtLimit governed param ([#4948](https://github.com/Agoric/agoric-sdk/issues/4948)) ([161e968](https://github.com/Agoric/agoric-sdk/commit/161e9689ea13fae8559a8915a87a5ec031969d5f))
* **run-protocol:** expose wrapLienedAmount on attestationTool ([766984e](https://github.com/Agoric/agoric-sdk/commit/766984e5f4265731abbd4ef826f180c568838d91))
* **run-protocol:** first cut at governance-induced RUN ([7500218](https://github.com/Agoric/agoric-sdk/commit/75002188c106370bc0b3d71ecb8b9a2ecb00ac8d))
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)
* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **cosmic-swingset:** grant addVaultType based on addr ([#4641](https://github.com/Agoric/agoric-sdk/issues/4641)) ([e439024](https://github.com/Agoric/agoric-sdk/commit/e439024788f27ea668b2ff0c5e486ab901807eb0))
* **run-protocol:** distinct vault phase for liquidated ([26593e4](https://github.com/Agoric/agoric-sdk/commit/26593e4eca7aa7997d56470c7892c30d6d9b6f93))
* **run-protocol:** liquidate serially ([#4931](https://github.com/Agoric/agoric-sdk/issues/4931)) ([91a62a5](https://github.com/Agoric/agoric-sdk/commit/91a62a57b34a4967209f1a7f88ea5dd0a085fb46)), closes [#4715](https://github.com/Agoric/agoric-sdk/issues/4715)
* **run-protocol:** RUNstake contract only, without payoff from rewards ([#4741](https://github.com/Agoric/agoric-sdk/issues/4741)) ([52f60eb](https://github.com/Agoric/agoric-sdk/commit/52f60eb192217ff3e4cf84a5a2ff8ada19fb5dcc))
* add collateral Reserve to hold collateral and add to AMM under governance control ([#4635](https://github.com/Agoric/agoric-sdk/issues/4635)) ([3e3f55f](https://github.com/Agoric/agoric-sdk/commit/3e3f55f48365d614c2215d8f311f973ff54b6cd0)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188) [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)
* add the ability to invoke an API to contract governance ([#4869](https://github.com/Agoric/agoric-sdk/issues/4869)) ([3123665](https://github.com/Agoric/agoric-sdk/commit/312366518471238430c79313f79e57aee1c551cd)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)


### Bug Fixes

* **bundleTool:** harden loaded bundles ([d77cea2](https://github.com/Agoric/agoric-sdk/commit/d77cea26f50e46833cd5cbde780f6393e616a4ec))
* **run-protocol:** more support for governance boot ([711d80d](https://github.com/Agoric/agoric-sdk/commit/711d80d6f4b854ca9dadb0bae764a9a0cc65fa59))
* **run-protocol:** re-structure vault notifiers to work with wallet ([9ac3f00](https://github.com/Agoric/agoric-sdk/commit/9ac3f00462cff6cfc20ab3325dad6798f3a8560f))
* **run-protocol:** shuffle around to fix types ([1c06bbd](https://github.com/Agoric/agoric-sdk/commit/1c06bbd71c39b09bb0e8007b0a96febf3bfbd771))
* **run-protocol:** store Presences, not Promises, in VaultManager ([5aee8af](https://github.com/Agoric/agoric-sdk/commit/5aee8af34fb1fab54633fc9a1acbf2818414de9a)), closes [#5106](https://github.com/Agoric/agoric-sdk/issues/5106) [#5121](https://github.com/Agoric/agoric-sdk/issues/5121) [#5106](https://github.com/Agoric/agoric-sdk/issues/5106)
* **run-protocol:** use wallet-friendly offer result notifiers ([b08330b](https://github.com/Agoric/agoric-sdk/commit/b08330b5bbb040979a68c19c8609e715e468b905))
* **vaults:** check args before acting in addVaultType ([12d5cfb](https://github.com/Agoric/agoric-sdk/commit/12d5cfbc9abfa553e40b7b458ce99420c7c54a85))
* Encode Passables, not just keys ([#4470](https://github.com/Agoric/agoric-sdk/issues/4470)) ([715950d](https://github.com/Agoric/agoric-sdk/commit/715950d6bfcbe6bc778b65a256dc5d26299172db))
* fix a bug in addLiquidity ([#5091](https://github.com/Agoric/agoric-sdk/issues/5091)) ([512db54](https://github.com/Agoric/agoric-sdk/commit/512db545c4e88fa4126c44a29f3a8775c330264f))
* renamings [#4470](https://github.com/Agoric/agoric-sdk/issues/4470) missed ([#4896](https://github.com/Agoric/agoric-sdk/issues/4896)) ([98c9f0e](https://github.com/Agoric/agoric-sdk/commit/98c9f0eabf6f0a85581e34ca0adf24f9805d1f0c))
* two isolated cases where a missing argument did not default ([531d367](https://github.com/Agoric/agoric-sdk/commit/531d367600e97652babff1ee8ffa4e4665f50baa))
* update types to specify ERef<Issuer> on addPool() ([6c13d99](https://github.com/Agoric/agoric-sdk/commit/6c13d997f89d914516dd6d4821d95364bd715b39)), closes [#4810](https://github.com/Agoric/agoric-sdk/issues/4810)
* **vats:** move `startPriceAuthority` earlier in the boot sequence ([bf93171](https://github.com/Agoric/agoric-sdk/commit/bf93171c69eb1a19b04c24c9283e0d433ca9d411))
* **vault:** make vault transfer invitation legible ([#4844](https://github.com/Agoric/agoric-sdk/issues/4844)) ([325ef39](https://github.com/Agoric/agoric-sdk/commit/325ef399cc9b65eedca71c2d2d7c42a4c6ec5191))
* **zoe:** pass brands (not issuers) to priceAggregator ([5800711](https://github.com/Agoric/agoric-sdk/commit/580071189bb60d83ceaa806bf85035173ae9563c))


### Reverts

* Revert "refactor(run-protocol): virtual kind for vault manager (#5052)" ([b08dc58](https://github.com/Agoric/agoric-sdk/commit/b08dc5836e8bea98de4316edc7ac5eef698c7072)), closes [#5052](https://github.com/Agoric/agoric-sdk/issues/5052)


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))
* **run-protocol:** remove liquidated flag from vault notifications ([6456af2](https://github.com/Agoric/agoric-sdk/commit/6456af25e154f01820efbdc1afb343902e385384))


### Code Refactoring

* atomically update multiple parameters via governance ([#5063](https://github.com/Agoric/agoric-sdk/issues/5063)) ([8921f59](https://github.com/Agoric/agoric-sdk/commit/8921f59bcdf217b311670c509b8500074eafd77a))
* **run-protocol:** rename uiNotifier to vaultNotifier ([554d41e](https://github.com/Agoric/agoric-sdk/commit/554d41ed9f9b35cd59133818e428d3055006e1ca))
* **run-protocol:** return assetNotifier instead of notifying on uiNotifier ([35d2d41](https://github.com/Agoric/agoric-sdk/commit/35d2d41f5345f593a647390c6f3dee5ccb44bf15))
* **run-protocol:** vaults hold liquidation proceeds until closed ([de32be9](https://github.com/Agoric/agoric-sdk/commit/de32be9b27780e75b70f06780872994fce7da02a))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/run-protocol@0.7.2...@agoric/run-protocol@0.8.0) (2022-02-24)


### ⚠ BREAKING CHANGES

* **run-protocol:** removes getBootstrapPayment from VaultFactory

### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)
* **run-protocol:** startRewardDistributor bootstrap behavior ([ad038ff](https://github.com/Agoric/agoric-sdk/commit/ad038ffa831f6be858cb2ebe8a429557e09186c2))


### Bug Fixes

* **run-protocol:** harden results from collection utilities ([5d8b4c1](https://github.com/Agoric/agoric-sdk/commit/5d8b4c14e798be5358530c5b0f7b5b59505431c9))
* **run-protocol:** produce priceAuthorityVat for fake authorities ([ba1b367](https://github.com/Agoric/agoric-sdk/commit/ba1b36792d45e96a8746e9b62b488cb404a2c72b))


### Miscellaneous Chores

* **run-protocol:** centralSupply contract for bootstrapPayment ([e526a7d](https://github.com/Agoric/agoric-sdk/commit/e526a7d8f01811560804cb48f77fce1347d8836b)), closes [#4021](https://github.com/Agoric/agoric-sdk/issues/4021)



### 0.7.2 (2022-02-21)


### Features

* **run-protocol:** interest charging O(1) for all vaults in a manager ([#4527](https://github.com/Agoric/agoric-sdk/issues/4527)) ([58103ac](https://github.com/Agoric/agoric-sdk/commit/58103ac216f4ce28cbbe73494af2ea11b5a110c0))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))
* **run-protocol:** variable rate vault/loan ([54d509e](https://github.com/Agoric/agoric-sdk/commit/54d509e74517c4385183b13cbf30c2976944ddd0))


### Bug Fixes

* dropping the max on the property-based tests led to problems ([#4600](https://github.com/Agoric/agoric-sdk/issues/4600)) ([3ddd160](https://github.com/Agoric/agoric-sdk/commit/3ddd160f343a7ad6faebeee8e09787310a63e211))
* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **amm:** Prevent creation of constant product AMM with non-fungible central token ([#4476](https://github.com/Agoric/agoric-sdk/issues/4476)) ([4f2d036](https://github.com/Agoric/agoric-sdk/commit/4f2d03612b2130c3fa053d239bde0c927245d1ff))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* when trades for zero are requested don't throw ([4516e5b](https://github.com/Agoric/agoric-sdk/commit/4516e5b6a2ab9176033956ee197687b5c6574647))
* **run-protocol:** update `makeRatio` import ([20965f1](https://github.com/Agoric/agoric-sdk/commit/20965f14c2212024cee9796a2454b5435aa3fcb8))



### [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.7.0...@agoric/treasury@0.7.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))


### Bug Fixes

* **treasury:** use liquidationMargin for maxDebt calculation ([#4163](https://github.com/Agoric/agoric-sdk/issues/4163)) ([c749af8](https://github.com/Agoric/agoric-sdk/commit/c749af86232029c0abc8b031366251a05e482930))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.5...@agoric/treasury@0.7.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **zoe:** must harden `amountKeywordRecord` before passing to ZCF objects

* chore: fix treasury errors, etc.

Co-authored-by: mergify[bot] <37929162+mergify[bot]@users.noreply.github.com>
* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Bug Fixes

* **zoe:** assert that amountKeywordRecord is a copyRecord ([#4069](https://github.com/Agoric/agoric-sdk/issues/4069)) ([fe9a9ff](https://github.com/Agoric/agoric-sdk/commit/fe9a9ff3de86608a0b1f8f9547059f89d45b948d))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.4...@agoric/treasury@0.6.5) (2021-10-13)

**Note:** Version bump only for package @agoric/treasury





### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.3...@agoric/treasury@0.6.4) (2021-09-23)

**Note:** Version bump only for package @agoric/treasury





### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.2...@agoric/treasury@0.6.3) (2021-09-15)

**Note:** Version bump only for package @agoric/treasury





### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.1...@agoric/treasury@0.6.2) (2021-08-21)

**Note:** Version bump only for package @agoric/treasury





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.0...@agoric/treasury@0.6.1) (2021-08-18)

**Note:** Version bump only for package @agoric/treasury





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.12...@agoric/treasury@0.6.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Features

* **treasury:** assert getBootstrapPayment amount ([3ed8e69](https://github.com/Agoric/agoric-sdk/commit/3ed8e695deb9a0f6c5d924374e61ceb8d9aaff1c))


### Bug Fixes

* return funds from liquidation via a seat payout ([#3656](https://github.com/Agoric/agoric-sdk/issues/3656)) ([d1a142d](https://github.com/Agoric/agoric-sdk/commit/d1a142d47ae0cf3db6512e85ac2de583193a2fdf))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.5.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.11...@agoric/treasury@0.5.12) (2021-08-16)

**Note:** Version bump only for package @agoric/treasury





### [0.5.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.11) (2021-08-15)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.10) (2021-08-14)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.9) (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.7...@agoric/treasury@0.5.8) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.6...@agoric/treasury@0.5.7) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.5...@agoric/treasury@0.5.6) (2021-06-28)

**Note:** Version bump only for package @agoric/treasury





### [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.4...@agoric/treasury@0.5.5) (2021-06-25)

**Note:** Version bump only for package @agoric/treasury





### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.3...@agoric/treasury@0.5.4) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.2...@agoric/treasury@0.5.3) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.1...@agoric/treasury@0.5.2) (2021-06-23)

**Note:** Version bump only for package @agoric/treasury





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.0...@agoric/treasury@0.5.1) (2021-06-16)

**Note:** Version bump only for package @agoric/treasury





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.2...@agoric/treasury@0.5.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **zoe:** new reallocate API to assist with reviewing conservation of rights (#3184)

### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))


### Code Refactoring

* **zoe:** new reallocate API to assist with reviewing conservation of rights ([#3184](https://github.com/Agoric/agoric-sdk/issues/3184)) ([f34e5ea](https://github.com/Agoric/agoric-sdk/commit/f34e5eae0812a9823d40d2d05ba98522c7846f2a))



## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.1...@agoric/treasury@0.4.2) (2021-05-10)

**Note:** Version bump only for package @agoric/treasury





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.0...@agoric/treasury@0.4.1) (2021-05-05)

**Note:** Version bump only for package @agoric/treasury





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.4...@agoric/treasury@0.4.0) (2021-05-05)


### Bug Fixes

* default and propagate the poolFee and protocolFee in treasury ([d210bcf](https://github.com/Agoric/agoric-sdk/commit/d210bcf1427bee73c9a13f0a00ee2a757d978cd2))
* have the treasury use the newSwap AMM implementation ([ed6b84a](https://github.com/Agoric/agoric-sdk/commit/ed6b84ad02cdf59431aa92d3d1e8c8e669379881))
* polishing touches ([334a253](https://github.com/Agoric/agoric-sdk/commit/334a253c02dc1c74117237f6ae18b31505e635af))


### Features

* share one instance of liquidation across all vaultManagers ([#2869](https://github.com/Agoric/agoric-sdk/issues/2869)) ([0ae776a](https://github.com/Agoric/agoric-sdk/commit/0ae776a91d0ec77443073f6340e714b8e161e062))





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.3...@agoric/treasury@0.3.4) (2021-04-22)

**Note:** Version bump only for package @agoric/treasury





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.2...@agoric/treasury@0.3.3) (2021-04-18)

**Note:** Version bump only for package @agoric/treasury





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.1...@agoric/treasury@0.3.2) (2021-04-16)

**Note:** Version bump only for package @agoric/treasury





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.0...@agoric/treasury@0.3.1) (2021-04-14)

**Note:** Version bump only for package @agoric/treasury





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.1...@agoric/treasury@0.3.0) (2021-04-13)


### Features

* move Pegasus contract to SDK ([d0ca2cc](https://github.com/Agoric/agoric-sdk/commit/d0ca2cc155953c63eef5f56f236fa9280984730a))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.0...@agoric/treasury@0.2.1) (2021-04-07)

**Note:** Version bump only for package @agoric/treasury





# 0.2.0 (2021-04-06)


### Bug Fixes

* allow liq margin plus fees for new loans ([#2813](https://github.com/Agoric/agoric-sdk/issues/2813)) ([5284548](https://github.com/Agoric/agoric-sdk/commit/52845480aa18dd76165b7997bcb2b4fad3e7c3be))
* improve factoring and assertions ([e7b356d](https://github.com/Agoric/agoric-sdk/commit/e7b356d608e7a774fb326e0b8988c7c79b938e72))
* update install-on-chain to use RUN instead of SCONES ([#2815](https://github.com/Agoric/agoric-sdk/issues/2815)) ([6ba74e9](https://github.com/Agoric/agoric-sdk/commit/6ba74e98e6cea423098646426bb136780f6f8ff4))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))


### Features

* add collateralConfig to issuer entries and enact ([8ce966b](https://github.com/Agoric/agoric-sdk/commit/8ce966bdb4f74960189b73d0721e92ae3c5912f0))
* add more collateral types, pivot to BLD/RUN and decimals ([7cbce9f](https://github.com/Agoric/agoric-sdk/commit/7cbce9f53fc81d273d3ebd7c78d93caedbd23b2e))
* introduce @agoric/treasury and pass tests ([6257231](https://github.com/Agoric/agoric-sdk/commit/6257231e23cd501e6e20ef16e4f4d569ff30b265))
* use multipoolAutoswap as the treasury priceAuthority ([a37c795](https://github.com/Agoric/agoric-sdk/commit/a37c795a98f38ac99581d441e00177364f404bd3))
