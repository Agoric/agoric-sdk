# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.26.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.26.1...@agoric/zoe@0.26.2) (2023-06-02)

**Note:** Version bump only for package @agoric/zoe





### [0.26.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.26.0...@agoric/zoe@0.26.1) (2023-05-24)

**Note:** Version bump only for package @agoric/zoe





## [0.26.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.3...@agoric/zoe@0.26.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* move PublicTopic to Zoe contractSupport
* rm obsolete makeStorageNodePathProvider
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies (#7074)
* storage paths by getPublicTopics
* rename 'fit' to 'mustMatch'
* **chainlink:** only smart-wallet oracles
* **chainlink:** 'data' string to 'unitPrice' bigint
* publish PriceDescription instead of PriceQuote
* **vat-data:** deprecate kinds in favor of Far Classes (#6106)
* ensure KindHandle has a tag
* **priceAggregator:** invitation makers

### Features

* **governor:** upgradable ([9a1a9c1](https://github.com/Agoric/agoric-sdk/commit/9a1a9c117e3819115544f729c6774b5071083458))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* **AMM:**  remove the AMM and cleanup bootstrap etc. dependencies ([#7074](https://github.com/Agoric/agoric-sdk/issues/7074)) ([ed5ee58](https://github.com/Agoric/agoric-sdk/commit/ed5ee58a276fce3c55f19e4f6f662ed579896c2c)), closes [#7047](https://github.com/Agoric/agoric-sdk/issues/7047)
* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **contractSupport:** provideAll for upgrades ([a7f9e14](https://github.com/Agoric/agoric-sdk/commit/a7f9e14e9f86b937f61fae43ab872d2dd32cd1eb))
* **contractSupport:** provideAll takes thunks ([f35034b](https://github.com/Agoric/agoric-sdk/commit/f35034b13b99dbfb8d472816644e09f9b4f2be3a))
* **contractSupport:** providePublicTopic ([5bdb71e](https://github.com/Agoric/agoric-sdk/commit/5bdb71e1af9ecde163322612de3e648fd75d7a47))
* **contractSupport:** provideSingleton ([9643cf0](https://github.com/Agoric/agoric-sdk/commit/9643cf00cf16f22e13e2de01e7dc508920fdc418))
* **contractSupport:** provideStoredSubscriber ([b073799](https://github.com/Agoric/agoric-sdk/commit/b073799142798660bb734d2ce38379977c7dd4cd))
* **contractSupport:** PublicTopics types and utils ([2c7865f](https://github.com/Agoric/agoric-sdk/commit/2c7865fa4e43c96c9a85be743a7f808a66b9311e))
* **contractSupport:** Recorder ([ce5d6de](https://github.com/Agoric/agoric-sdk/commit/ce5d6dee081df999afca4bc0374b82060c388fc7))
* **contractSupport:** StorageNodePathProvider ([cfa0375](https://github.com/Agoric/agoric-sdk/commit/cfa037564d78cd1d99c1677d8f1c5cd26cafaeb6))
* **oracle:** support continuing invitation ([ed950f5](https://github.com/Agoric/agoric-sdk/commit/ed950f5498e7773c5bd433b76725c8f093e01d48))
* **oracle!:** roundId in price results ([e1f7488](https://github.com/Agoric/agoric-sdk/commit/e1f7488e52388b013343d6a6d0dd03ce5b2c9932))
* **priceAggregator:** invitation makers ([bdc4052](https://github.com/Agoric/agoric-sdk/commit/bdc40528d2192a1af5fae39f400ba00bf5990cfd))
* **priceAuthority:** registry singleton durable ([3d20838](https://github.com/Agoric/agoric-sdk/commit/3d20838953dd216e44cc5488922ce09ed7d51a56))
* **prices:** scaledPriceAuthority upgradable ([91c6181](https://github.com/Agoric/agoric-sdk/commit/91c6181ff6e7cbd74e884174e90aa9510efc229a))
* **rpc:** publish latestRound ([9e2617b](https://github.com/Agoric/agoric-sdk/commit/9e2617b02c2be9465b6df328bbef8145a3ab8901))
* **scaledPriceAuthority:** support initialPrice before 1st round ([0c37233](https://github.com/Agoric/agoric-sdk/commit/0c37233bf157fa59eca3a867217ca94b8c334f7d))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **typeGuards:** FeeMintAccessshape ([63b0aad](https://github.com/Agoric/agoric-sdk/commit/63b0aad001e45fd0ddeb0d5a6673e8dd53dd9de6))
* **types:** export expolicit tools types ([2a96f45](https://github.com/Agoric/agoric-sdk/commit/2a96f4521a693ca27409e6e7aa8015299b7c2f46))
* **types:** infer this.state in far classes ([11b35d3](https://github.com/Agoric/agoric-sdk/commit/11b35d38448c9665a6db5a919b37744d2d929a53))
* **types:** paramterize Instance ([8d1832a](https://github.com/Agoric/agoric-sdk/commit/8d1832a8001ccd98339d68856b0756cad25462d4))
* **vaults:** durable Recorders for chain storage ([0e34930](https://github.com/Agoric/agoric-sdk/commit/0e3493025685a413cccd99f9e41a3c9c9a8c99cd))
* **vaults:** manager singletons provider ([54c1f51](https://github.com/Agoric/agoric-sdk/commit/54c1f513d9899adef6b9e8bb4a40907ee581550b))
* **vaults:** one Exo kind for VaultManager ([29660dd](https://github.com/Agoric/agoric-sdk/commit/29660dddb9533d8f55ebd43a5f59f9a0d93f0d62))
* **zoe:** assertFullIssuerRecord ([dacaa74](https://github.com/Agoric/agoric-sdk/commit/dacaa740d59c4bfdf1ea2a2db45e4322c4527c98))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* **zoe:** default bundle label to (prefix of) bundleID ([9c50355](https://github.com/Agoric/agoric-sdk/commit/9c503558164f235084ac47c6b3ba1239acd6dc50))
* **zoe:** error on unexpected properties from start() ([807d175](https://github.com/Agoric/agoric-sdk/commit/807d175632bda863653fd2aef7169136be8b1a85))
* Support for labeling contract vats at runtime ([21834c4](https://github.com/Agoric/agoric-sdk/commit/21834c4bb45f67f400d13da3796b578a76aed672)), closes [#4738](https://github.com/Agoric/agoric-sdk/issues/4738)
* **zoe:** pass key to init in makeEphemeraProvider ([32ad4bc](https://github.com/Agoric/agoric-sdk/commit/32ad4bc545c45cd83c0639b00b41c4317afb4464))
* **zygote:** better diagnostics ([5feafb5](https://github.com/Agoric/agoric-sdk/commit/5feafb504c38d0d50cb9e8f5aed7e3bd16480388))
* assertParsableNumber ([3b1550b](https://github.com/Agoric/agoric-sdk/commit/3b1550b1bbcf819c60ebf99dbcfd40667acb4212))
* boot-oracles ([ce8f8de](https://github.com/Agoric/agoric-sdk/commit/ce8f8de65ad4c14b4e8d699cd721683cfa1cc495))
* getPath() on StorageNode and StoredSubscriber ([dae47a5](https://github.com/Agoric/agoric-sdk/commit/dae47a553288335960b5e4f2741a09b87ae896bc))
* TransferPartShape ([56928d6](https://github.com/Agoric/agoric-sdk/commit/56928d6d58183f5fc00e381a733468dd8575e6f0))
* **types:** addChild checks rest args ([6adff6d](https://github.com/Agoric/agoric-sdk/commit/6adff6d20d750a7119049b855c1e1b1223c60cdc))
* check privateArgsShape ([be31fbc](https://github.com/Agoric/agoric-sdk/commit/be31fbc16d913878780af0ecf5fe526f88994f7b))
* ensure KindHandle has a tag ([7744d7e](https://github.com/Agoric/agoric-sdk/commit/7744d7ede4a9cfc3317207438192d8375f71b9d7))
* priceAggregatorChainlink in inter-protocol ([d8707a5](https://github.com/Agoric/agoric-sdk/commit/d8707a59431223fcd394b0fbb94284e22237446c))
* PriceQuoteShape ([b88e7e6](https://github.com/Agoric/agoric-sdk/commit/b88e7e652fa4d378dc807a6ee880668f004ebc73))
* publish price quotes ([e3e3984](https://github.com/Agoric/agoric-sdk/commit/e3e3984b389a143bccd084773474e27d94745561))
* publish PriceDescription instead of PriceQuote ([30d3966](https://github.com/Agoric/agoric-sdk/commit/30d3966755900869dd6332a974077073f201983c))
* storage paths by getPublicTopics ([40a8624](https://github.com/Agoric/agoric-sdk/commit/40a8624240f241a686c28bd7d7c7ef1ef780f984))
* **zoe:** fit customTermsShape ([5f14ac4](https://github.com/Agoric/agoric-sdk/commit/5f14ac4c54cb0f88b228115d57c3ba63a7b10753))


### Bug Fixes

* repair a provide collision in priceAuthorityRegistry ([479fb92](https://github.com/Agoric/agoric-sdk/commit/479fb920047260aaae3af9223fb29775faf51e4c))
* **chainlink:** publish new quotes ([9914899](https://github.com/Agoric/agoric-sdk/commit/99148990824661bdf447fad6f420882a43688aa1))
* **types:** makeStoreUtils return types ([bd07ba0](https://github.com/Agoric/agoric-sdk/commit/bd07ba024734a383ae7554f1f3f85c62b1c86093))
* **zygote:** validate privateArgsShape in restart ([d40851d](https://github.com/Agoric/agoric-sdk/commit/d40851d75393623e6caefaf9e86743ebdb6a6e31))
* terminating vat upon failure ([c07d55a](https://github.com/Agoric/agoric-sdk/commit/c07d55a8cbb84a53dfc0819d131dc9f0ae12f766))
* **contractSupport:** makeEphemeraProvider gc ([5eee9c7](https://github.com/Agoric/agoric-sdk/commit/5eee9c797eab4d827c6c8f6c3b75ed651879099c))
* **scaledPriceAuthority:** initialPrice in/out in quote notifier ([0cfe3a1](https://github.com/Agoric/agoric-sdk/commit/0cfe3a103c29e183eae27e732e270da984c9dbf4))
* **scaledPriceAuthority:** invert initialPrice; support quoteGiven ([5dad466](https://github.com/Agoric/agoric-sdk/commit/5dad4660100d6c776f1757ea2e5d7d27890665a2))
* **scaledPriceAuthority:** timing of makeQuoteNotifier vs quoteGiven ([bb50f26](https://github.com/Agoric/agoric-sdk/commit/bb50f264fc957ba59912243e394d947c678250a9))
* **types:** ZoeService annotation ([24aebe6](https://github.com/Agoric/agoric-sdk/commit/24aebe69b6773a7c63cc0d1193e5e09eb4e52cc6))
* **vat-data:** deprecate kinds in favor of Far Classes ([#6106](https://github.com/Agoric/agoric-sdk/issues/6106)) ([b63360b](https://github.com/Agoric/agoric-sdk/commit/b63360b416b06cb654d5fc51428a3252e1f0b34f))
* **zcf:** catch initSeatMgrAndMintFactory rejections ([a91ec53](https://github.com/Agoric/agoric-sdk/commit/a91ec535a0a56a2282a6686cc0b14f8490808559))
* **zcf:** mint kind during reincarnation ([c537f6c](https://github.com/Agoric/agoric-sdk/commit/c537f6cf3c99ac1122b9fa1cec7a73f061cc82bf))
* **zcf:** pass newPrivateArgs in restartContract ([1477ab6](https://github.com/Agoric/agoric-sdk/commit/1477ab60ee2759c656d8a938f0f062b36f6100ae))
* **zcfZygote:** instanceRecHolder for restart ([2936e84](https://github.com/Agoric/agoric-sdk/commit/2936e8461741dad2de7611ca336398eaf7b1f614))
* **zoe:** Add explicit makeDurableZoeKit ([a3f9dc0](https://github.com/Agoric/agoric-sdk/commit/a3f9dc054b26ede9916e10c0c310f8158b6be0cc))
* **zoe:** adjust for `@endo/patterns` types ([ec7a5b1](https://github.com/Agoric/agoric-sdk/commit/ec7a5b11ff4d1b4bb42bbbd742ef3b1e8c82cfe1))
* **zoe:** handle branded TimestampRecord ([2cebcf0](https://github.com/Agoric/agoric-sdk/commit/2cebcf08f22e2366d65fa5780ba674726087bd81))
* **zoe:** harden startInstance return ([66063c6](https://github.com/Agoric/agoric-sdk/commit/66063c6f8407fdf962c50d9256de477cc9ffacd7))
* **zoe:** installBundle handles HashBundle format ([#6828](https://github.com/Agoric/agoric-sdk/issues/6828)) ([0f75764](https://github.com/Agoric/agoric-sdk/commit/0f7576432d93ec83b420ee22ed2346eaaee99f2a))
* **zoe:** price authority durable quote mint ([91ebc26](https://github.com/Agoric/agoric-sdk/commit/91ebc267267b45d1cd6e20498af3f8473f7c1a42))
* **zoe:** Upgradable Zoe vat ([83a5ab7](https://github.com/Agoric/agoric-sdk/commit/83a5ab74ba6e7b55097dc0d3acac10b0404c56bb))
* **zoe:** ZcfMintI mintGains interface ([392a6c4](https://github.com/Agoric/agoric-sdk/commit/392a6c41364d9324ebfa63ff40865c6e7afa8fd1))
* await was missing in test ([#7163](https://github.com/Agoric/agoric-sdk/issues/7163)) ([7a7bf5a](https://github.com/Agoric/agoric-sdk/commit/7a7bf5a4f6ec962f39c6c0c573f8bc2770be4526))
* better proposal mismatch errors ([#6477](https://github.com/Agoric/agoric-sdk/issues/6477)) ([42fdddf](https://github.com/Agoric/agoric-sdk/commit/42fdddfbc87a7e61b848cdf00a06f1886af935d7))
* bootstrap handles BundleIDs, not full bundles ([de8b0f5](https://github.com/Agoric/agoric-sdk/commit/de8b0f5d35e0938fa00d795d11cfad3acadd9428)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826) [#4374](https://github.com/Agoric/agoric-sdk/issues/4374)
* delete deprecated spread customDetails ([#7067](https://github.com/Agoric/agoric-sdk/issues/7067)) ([93f7eb1](https://github.com/Agoric/agoric-sdk/commit/93f7eb120fcfd797af5eef84b3f4c3d8a82fc88d))
* missing zcfMint options ([753ea03](https://github.com/Agoric/agoric-sdk/commit/753ea03d713f791bebeea82422d659ffc46bca80))
* more precise startInstance ([#7164](https://github.com/Agoric/agoric-sdk/issues/7164)) ([1de9294](https://github.com/Agoric/agoric-sdk/commit/1de9294d79cd6d0b6e5faefb6086724f1bd35e7b))
* some stateShapes ([50c9fe4](https://github.com/Agoric/agoric-sdk/commit/50c9fe49d0fe890a08c0c28a00780f4924f7928c))
* **zoeSeat:** handling of non-durable offerResult ([8cb12fe](https://github.com/Agoric/agoric-sdk/commit/8cb12fe2fe9254f77e17e0e777255e1037cca040))
* fewer deprecated defineKind etc ([#7141](https://github.com/Agoric/agoric-sdk/issues/7141)) ([2636f1e](https://github.com/Agoric/agoric-sdk/commit/2636f1e0beeb8bc2b7dc9d3ed47cd53a47b45685))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* tighten `bindAllMethods` caller types ([15f384f](https://github.com/Agoric/agoric-sdk/commit/15f384f04ed94f0ff51270717e74c1668809c895))
* **zoe:** payments more recoverable ([#7112](https://github.com/Agoric/agoric-sdk/issues/7112)) ([ce7244d](https://github.com/Agoric/agoric-sdk/commit/ce7244d6cf23f57e6de73b5d119e9681456fded7))
* replace zoe.install with zoe.installBundleID ([8a91b1b](https://github.com/Agoric/agoric-sdk/commit/8a91b1b06bf1a62c08156e595cf46f5194f73337)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826)
* swingset should define these types, not zoe/ERTP ([35a977b](https://github.com/Agoric/agoric-sdk/commit/35a977b2fa3c03bd5292718e318a26e897ff3d04))
* update all clients of @agoric/time to handle the new home ([5c4fb24](https://github.com/Agoric/agoric-sdk/commit/5c4fb241940c74be6b081718b9350bceba95b9cd))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric-sdk/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))
* **zoeAdmin:** default payouts value ([2e0bf13](https://github.com/Agoric/agoric-sdk/commit/2e0bf1322c2cffd618f6032911a8c7a4d5e4e8f4))
* use atomicTransfers rather than stagings. ([#6577](https://github.com/Agoric/agoric-sdk/issues/6577)) ([65d3f14](https://github.com/Agoric/agoric-sdk/commit/65d3f14c8102993168d2568eed5e6acbcba0c48a))


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)
* rm obsolete makeStorageNodePathProvider ([dc0a4a5](https://github.com/Agoric/agoric-sdk/commit/dc0a4a545d89c8bf89bf44e7c888537ddf626522))
* **chainlink:** 'data' string to 'unitPrice' bigint ([a8c836c](https://github.com/Agoric/agoric-sdk/commit/a8c836cb70a033d78199372669f6f95314de4d8f))
* **chainlink:** only smart-wallet oracles ([8e61373](https://github.com/Agoric/agoric-sdk/commit/8e61373a0ca8c6afc0b2f27a3568011312624c14))


### Code Refactoring

* move PublicTopic to Zoe contractSupport ([c51ea3d](https://github.com/Agoric/agoric-sdk/commit/c51ea3de22f50e05fcc1aaabd2108e785d51eb2e))



### [0.25.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.4...@agoric/zoe@0.25.5) (2023-02-17)

**Note:** Version bump only for package @agoric/zoe





### [0.25.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.3...@agoric/zoe@0.25.4) (2022-12-14)

**Note:** Version bump only for package @agoric/zoe





### [0.25.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.2...@agoric/zoe@0.25.3) (2022-10-18)

**Note:** Version bump only for package @agoric/zoe





### [0.25.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.1...@agoric/zoe@0.25.2) (2022-10-08)

**Note:** Version bump only for package @agoric/zoe





### [0.25.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.25.0...@agoric/zoe@0.25.1) (2022-10-05)


### Bug Fixes

* protect zoe from keyword collision ([#6370](https://github.com/Agoric/agoric-sdk/issues/6370)) ([02af4a0](https://github.com/Agoric/agoric-sdk/commit/02af4a07ad1f99b545d0bf525bd1ea97d74639d1))



## [0.25.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.24.0...@agoric/zoe@0.25.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **SwingSet:** Representatives inherit bound methods (#5970)
* **store:** move some util where they are more reusable (#5990)
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment)

### Features

* **zoe:** expose keywords in error messages ([3c9c497](https://github.com/Agoric/agoric-sdk/commit/3c9c497b0c22bf9729cc65af26a0d6a32450a4fd))
* **zoe:** zcfSeat.clear() handles no-allocations case ([0982aa8](https://github.com/Agoric/agoric-sdk/commit/0982aa86a6b99f197760edbdde028375661b6ae0))
* save PSM adminFacet in bootstrap ([#6101](https://github.com/Agoric/agoric-sdk/issues/6101)) ([14b20e6](https://github.com/Agoric/agoric-sdk/commit/14b20e6054703240754695ba3ba385d0e954d41c))
* **chainStorage:** assertPathSegment (replacing sanitizePathSegment) ([cc4ca9a](https://github.com/Agoric/agoric-sdk/commit/cc4ca9a51665e2d4980ade3f3803655c43ac7001))
* **priceAggregator:** publish quotes ([d4054d9](https://github.com/Agoric/agoric-sdk/commit/d4054d98bd5a094b45ed2e3e70bb1ff997f4b2c5))
* **zoe:** add E(userSeat).wasWantSatisfied() ([#5905](https://github.com/Agoric/agoric-sdk/issues/5905)) ([764c3cd](https://github.com/Agoric/agoric-sdk/commit/764c3cd02f7ee6c9f8a50814f58de7ccef17a5e0))
* **zoe:** unitAmount helper ([9007f4c](https://github.com/Agoric/agoric-sdk/commit/9007f4c5710f65566842559680f7a0557f57398d))
* distinctive rejection values for promises severed by vat upgrade ([2be42ca](https://github.com/Agoric/agoric-sdk/commit/2be42ca166d8281f5de2a07c8d7a1327f94ee74d)), closes [#5649](https://github.com/Agoric/agoric-sdk/issues/5649)
* give contracts the ability to pause invitations ([#5749](https://github.com/Agoric/agoric-sdk/issues/5749)) ([732e229](https://github.com/Agoric/agoric-sdk/commit/732e229ca5d3f3bb196b8bcaa442be3f03f99a62)), closes [#5770](https://github.com/Agoric/agoric-sdk/issues/5770) [#5036](https://github.com/Agoric/agoric-sdk/issues/5036)
* **ses-ava:** support full API of Ava ([3b5fd6c](https://github.com/Agoric/agoric-sdk/commit/3b5fd6c103a4a9207eaf2e761b3a096ce78c3d16))
* **zoe:** tag spawned vats with `zcf` ([6f82d82](https://github.com/Agoric/agoric-sdk/commit/6f82d82317407d142ed666c00f2bdbdbfa88575d))
* **zoe:** tickN for ManualTimer ([7750c86](https://github.com/Agoric/agoric-sdk/commit/7750c86b9d81e441b204eff6129dcb047df75769))


### Bug Fixes

* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* better mismatch errors ([#5947](https://github.com/Agoric/agoric-sdk/issues/5947)) ([46e34f6](https://github.com/Agoric/agoric-sdk/commit/46e34f6deb7e5d8210a227bdea32fe3e2296e9ef))
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* convert upgradable covered call to far classes ([#6120](https://github.com/Agoric/agoric-sdk/issues/6120)) ([f7d5999](https://github.com/Agoric/agoric-sdk/commit/f7d5999a6eacde59acb558a49ceea28d686d1559))
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* if zcfMint.burnLosses violates offerSafety, don't stage changes ([94415cf](https://github.com/Agoric/agoric-sdk/commit/94415cf67a8fedf5f7046989c07b2c1d9d0483fa))
* makePublishKit ([#5435](https://github.com/Agoric/agoric-sdk/issues/5435)) ([d8228d2](https://github.com/Agoric/agoric-sdk/commit/d8228d272cfe18aa2fba713fb5acc4e84eaa1e39))
* patterns impose resource limits ([#6057](https://github.com/Agoric/agoric-sdk/issues/6057)) ([548c053](https://github.com/Agoric/agoric-sdk/commit/548c053dbe779fe8cede2ca5651c146c9fee2a8e))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* rewrite zoe/tools/manualTimer.js, update tests ([0b5df16](https://github.com/Agoric/agoric-sdk/commit/0b5df16f83629efb7cb48d54250139e082ed109c))
* schema limit minting and offers ([#5461](https://github.com/Agoric/agoric-sdk/issues/5461)) ([dc7baa1](https://github.com/Agoric/agoric-sdk/commit/dc7baa195281f6442cfc28d0984adf0cf0d2341b))
* tests offer with invitation promise ([#5608](https://github.com/Agoric/agoric-sdk/issues/5608)) ([1aa4565](https://github.com/Agoric/agoric-sdk/commit/1aa4565483dcd989c699348e8300c565e179598b))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))
* throw error on attempt to reuse a kind handle ([5ac8cb1](https://github.com/Agoric/agoric-sdk/commit/5ac8cb1641fe64590d04b3a27668e2001168cd9f)), closes [#5628](https://github.com/Agoric/agoric-sdk/issues/5628)
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **amm:** Prevent calls to remove Liquidity when the pool is empty ([8aad77b](https://github.com/Agoric/agoric-sdk/commit/8aad77b8907d938ad66aed61cd160a7f79159ce2)), closes [#5131](https://github.com/Agoric/agoric-sdk/issues/5131)
* **priceAuthorityTransform:** ask for the sourceQuoteIssuer on demand ([9c2a868](https://github.com/Agoric/agoric-sdk/commit/9c2a8689cd02d028d00f286d67da2b5de9f85083))
* **priceAuthorityTransform:** mutable case missed scaleQuote ([e01cce6](https://github.com/Agoric/agoric-sdk/commit/e01cce615d3dec42bdbdcd6016ab78f8f1f98500))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* **SwingSet:** Representatives inherit bound methods ([#5970](https://github.com/Agoric/agoric-sdk/issues/5970)) ([ba1ed62](https://github.com/Agoric/agoric-sdk/commit/ba1ed62062a63862e2eecb598b0bd1d2ac828e1f))
* **zoe:** fix fakePriceAuthority event ordering ([15c3590](https://github.com/Agoric/agoric-sdk/commit/15c35906ad37498a8888ea61f71251aa50cf0b21))
* **zoe:** limit keywords to 100 characters ([37432c8](https://github.com/Agoric/agoric-sdk/commit/37432c8392b6248c0013c96d74b4b92b67c85083))
* **zoe:** Sink unhandled borrow test rejections ([d45f76e](https://github.com/Agoric/agoric-sdk/commit/d45f76e9cb0dfd67fec9fd0263b8ddd01dfb838d))
* **zoe:** zcf.clear() - don't ignoreContext ([dde1dfe](https://github.com/Agoric/agoric-sdk/commit/dde1dfe7afc4b92d4390881dcb5cd6ef53d64196))
* shutdown controller after tests ([93191e3](https://github.com/Agoric/agoric-sdk/commit/93191e33783f6a3286b55e3496fa0d7024690dd1))
* time as branded value ([#5821](https://github.com/Agoric/agoric-sdk/issues/5821)) ([34078ff](https://github.com/Agoric/agoric-sdk/commit/34078ff4b34a498f96f3cb83df3a0b930b98bbec))
* userSeat allocation only for testing ([#5826](https://github.com/Agoric/agoric-sdk/issues/5826)) ([9cb561b](https://github.com/Agoric/agoric-sdk/commit/9cb561b39d56cc54e87258980d333d912e837f38))


### Code Refactoring

* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



## [0.24.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.23.0...@agoric/zoe@0.24.0) (2022-05-28)


### ⚠ BREAKING CHANGES

* **amm:** push reserved assets to reserve contract (#5429)
* **AMM:** make amm.addPool() require minimum collateral (#5377)

### Features

* **amm:** push reserved assets to reserve contract ([#5429](https://github.com/Agoric/agoric-sdk/issues/5429)) ([20472a1](https://github.com/Agoric/agoric-sdk/commit/20472a1924352df1611ed408c420ac0c56457fc7))
* **AMM:** make amm.addPool() require minimum collateral ([#5377](https://github.com/Agoric/agoric-sdk/issues/5377)) ([2fedea6](https://github.com/Agoric/agoric-sdk/commit/2fedea666d6730c852aee49c045449aa5d8bebb5)), closes [#4643](https://github.com/Agoric/agoric-sdk/issues/4643) [#5397](https://github.com/Agoric/agoric-sdk/issues/5397)
* **vault:** econ metrics notifiers ([#5260](https://github.com/Agoric/agoric-sdk/issues/5260)) ([6c3cdf3](https://github.com/Agoric/agoric-sdk/commit/6c3cdf37234c3053f7dfcd745e21ae78d828ad0b))
* **vault:** liquidation penalty handled by liquidation contracts ([#5343](https://github.com/Agoric/agoric-sdk/issues/5343)) ([ce1cfaf](https://github.com/Agoric/agoric-sdk/commit/ce1cfafb6d375453865062e1bd66ade66fb80686))
* **zoe:** Support installation of hash bundles ([8f9ad75](https://github.com/Agoric/agoric-sdk/commit/8f9ad759b17d81b47c9176c61fc81600e32c82a1))


### Bug Fixes

* **zoe:** Note [#4974](https://github.com/Agoric/agoric-sdk/issues/4974) subsume installBundleID in install ([815c035](https://github.com/Agoric/agoric-sdk/commit/815c035bbfc897d4d490f934b9e28ff79c8e958f))
* de-legacy-ize ManualTimer ([#5369](https://github.com/Agoric/agoric-sdk/issues/5369)) ([2daf2a4](https://github.com/Agoric/agoric-sdk/commit/2daf2a4c358d2cc6bf68c722d82ae980bad806ba))



## [0.23.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.22.0...@agoric/zoe@0.23.0) (2022-05-09)


### Features

* **contractSupport:** looser ratio op brands, `parse`, `subtract` ([b1978b8](https://github.com/Agoric/agoric-sdk/commit/b1978b885d8f441d2f10177b3084837ef6fa3683))
* **vault:** Liquidate incrementally ([#5129](https://github.com/Agoric/agoric-sdk/issues/5129)) ([b641269](https://github.com/Agoric/agoric-sdk/commit/b64126996d4844c07016deadc87269dc387c4aae))
* **zoe:** `priceAuthorityTransform.js` and `scaledPriceAuthority.js` ([d897c66](https://github.com/Agoric/agoric-sdk/commit/d897c662b19dbd14a7894d86b7de8f5f19dada3d))
* **zoe:** half-to-even (bankers) rounding for ratio math ([b5770e8](https://github.com/Agoric/agoric-sdk/commit/b5770e8b1bbe26a3dc430b14e5c8714156f4f842))
* **zoe:** use bankers rounding in quantize ([f726786](https://github.com/Agoric/agoric-sdk/commit/f72678688fcfec1c3952080e61339688913f38dd))


### Bug Fixes

* **contractSupport:** median divide is by a scalar ([78e426e](https://github.com/Agoric/agoric-sdk/commit/78e426e014fd7cdbc95396bb3cdb552269a6a641))
* **priceAggregator:** internally use ratios to preserve price precision ([f48c63d](https://github.com/Agoric/agoric-sdk/commit/f48c63d1c9edccf3c3ef50697211469db35a587c))
* fix types of stopAcceptingOffers ([#5225](https://github.com/Agoric/agoric-sdk/issues/5225)) ([3996280](https://github.com/Agoric/agoric-sdk/commit/39962808ce77432e6ce74a1bdac207f10545a626))
* **priceAggregator:** use `privateArgs`, not `initializeQuoteMint` ([f2c4f8e](https://github.com/Agoric/agoric-sdk/commit/f2c4f8e37f6c4d35569f683b84f619a0fb4fc968))



## [0.22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.21.3...@agoric/zoe@0.22.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* add the ability to invoke an API to contract governance (#4869)
* **run-protocol:** vaults hold liquidation proceeds until closed
* consistent Node engine requirement (>=14.15.0)

### Features

* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* **oracle:** add `getRoundStartNotifier` to aggregators ([e97a2d9](https://github.com/Agoric/agoric-sdk/commit/e97a2d9946ff426c0efa474979fdd4e917cb7f0a))
* **priceAggregator:** `deleteOracle` and `getRoundCompleteNotifier` ([881b7d6](https://github.com/Agoric/agoric-sdk/commit/881b7d6c8cfdfc3a840d8f3e2e6e3550394fa52b))
* add the ability to invoke an API to contract governance ([#4869](https://github.com/Agoric/agoric-sdk/issues/4869)) ([3123665](https://github.com/Agoric/agoric-sdk/commit/312366518471238430c79313f79e57aee1c551cd)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **priceAggregator:** implement `makeOracleInvitation` ([35354bb](https://github.com/Agoric/agoric-sdk/commit/35354bbb6d5de1441919fc07281625d51f21f198))
* **run-protocol:** charge penalty for liquidation ([#4996](https://github.com/Agoric/agoric-sdk/issues/4996)) ([5467be4](https://github.com/Agoric/agoric-sdk/commit/5467be4fb5c4cc47f34736eb669e207b26eb711d))
* **run-protocol:** RUNstake contract only, without payoff from rewards ([#4741](https://github.com/Agoric/agoric-sdk/issues/4741)) ([52f60eb](https://github.com/Agoric/agoric-sdk/commit/52f60eb192217ff3e4cf84a5a2ff8ada19fb5dcc))


### Bug Fixes

* **chainlinkAggregator:** implement oracleKeys for mapping ([76605ce](https://github.com/Agoric/agoric-sdk/commit/76605ce18801e0a7b834d1de469136206494b348))
* **oracle:** wake up to update priceAggregator push-only oracles ([c9a59fe](https://github.com/Agoric/agoric-sdk/commit/c9a59fed9f247332f93f56432c97c2bd756eff6e))
* **zoe:** add zoe.installBundleID ([0fad95f](https://github.com/Agoric/agoric-sdk/commit/0fad95fa1f7541bc2b790cde70a20273d11a12c4)), closes [#4563](https://github.com/Agoric/agoric-sdk/issues/4563)
* **zoe:** pass brands (not issuers) to priceAggregator ([5800711](https://github.com/Agoric/agoric-sdk/commit/580071189bb60d83ceaa806bf85035173ae9563c))
* correct bugs due to weird & mistaken buildRootObject usage ([990e7d8](https://github.com/Agoric/agoric-sdk/commit/990e7d88a5c24bb077f349517139c8aa2d5f536a))
* **zoe:** get ZCF bundlecap from vatAdminService ([872a11a](https://github.com/Agoric/agoric-sdk/commit/872a11a63db1062a9097ac9271f0bba6a727391b)), closes [#4487](https://github.com/Agoric/agoric-sdk/issues/4487)


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))


### Code Refactoring

* **run-protocol:** vaults hold liquidation proceeds until closed ([de32be9](https://github.com/Agoric/agoric-sdk/commit/de32be9b27780e75b70f06780872994fce7da02a))



### [0.21.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.21.2...@agoric/zoe@0.21.3) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



### [0.21.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.21.1...@agoric/zoe@0.21.2) (2022-02-21)


### Features

* **run-protocol:** interest charging O(1) for all vaults in a manager ([#4527](https://github.com/Agoric/agoric-sdk/issues/4527)) ([58103ac](https://github.com/Agoric/agoric-sdk/commit/58103ac216f4ce28cbbe73494af2ea11b5a110c0))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* **zoe:** fix InstanceRecord type ([9324cfe](https://github.com/Agoric/agoric-sdk/commit/9324cfed2cff9cf96523859010537ffdea69e721))
* **zoe:** teach fakeVatAdmin to createVatByName(zcf) ([6f88e2b](https://github.com/Agoric/agoric-sdk/commit/6f88e2b73193aeb417f506f142dff98312f3500c)), closes [#4372](https://github.com/Agoric/agoric-sdk/issues/4372) [#4487](https://github.com/Agoric/agoric-sdk/issues/4487)
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))
* fullOrder leak. Semi-fungibles via CopyBags ([#4305](https://github.com/Agoric/agoric-sdk/issues/4305)) ([79c4276](https://github.com/Agoric/agoric-sdk/commit/79c4276da8c856674bd425c54715adec92648c48))
* getPublicFacet accepts promise for instance ([#4328](https://github.com/Agoric/agoric-sdk/issues/4328)) ([f716199](https://github.com/Agoric/agoric-sdk/commit/f71619978948027cd2dfe0ec9cd175236853588c))
* minor adjustments from purple day1 ([#4271](https://github.com/Agoric/agoric-sdk/issues/4271)) ([72cc8d6](https://github.com/Agoric/agoric-sdk/commit/72cc8d6bcf428596653593708959446fb0a29596))
* minor, from purple ([#4304](https://github.com/Agoric/agoric-sdk/issues/4304)) ([2984a74](https://github.com/Agoric/agoric-sdk/commit/2984a7487bcc6064c6cb899b7540e11159eedefd))
* ordered set operations ([#4196](https://github.com/Agoric/agoric-sdk/issues/4196)) ([bda9206](https://github.com/Agoric/agoric-sdk/commit/bda920694c7ab573822415653335e258b9c21281))
* towards patterns and stores ([c241e39](https://github.com/Agoric/agoric-sdk/commit/c241e3978a36778197b1bf3874b07f1ed4df9ceb))



### [0.21.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.21.0...@agoric/zoe@0.21.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))



## [0.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.20.0...@agoric/zoe@0.21.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* remove newSwap; replace with constantProduct AMM where needed (#4097)
* **zoe:** must harden `amountKeywordRecord` before passing to ZCF objects

* chore: fix treasury errors, etc.

Co-authored-by: mergify[bot] <37929162+mergify[bot]@users.noreply.github.com>
* METER_TYPE -> xs-meter-12

  - update metering tests
* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Features

* Add displayInfo for the liquidity tokens created in the AMM ([#4102](https://github.com/Agoric/agoric-sdk/issues/4102)) ([aa8e3c3](https://github.com/Agoric/agoric-sdk/commit/aa8e3c3a4374f90f3e12929d842a378bd5c51e38))
* expose XS the->currentHeapCount to metering/delivery results ([a031d79](https://github.com/Agoric/agoric-sdk/commit/a031d7900440ee3717c15e7c5be4ae8226ef5530)), closes [#3910](https://github.com/Agoric/agoric-sdk/issues/3910)
* remove newSwap; replace with constantProduct AMM where needed ([#4097](https://github.com/Agoric/agoric-sdk/issues/4097)) ([aaea050](https://github.com/Agoric/agoric-sdk/commit/aaea0503b369e4d0b4d9cbb1e00ee02109470060))
* **zoe/contracts:** Support first-price auction, fix wakeup timer in current contract ([#4046](https://github.com/Agoric/agoric-sdk/issues/4046)) ([4fdfe82](https://github.com/Agoric/agoric-sdk/commit/4fdfe829f2fb040540a44d7d16de06dc066759b4))


### Bug Fixes

* **zoe:** assert that amountKeywordRecord is a copyRecord ([#4069](https://github.com/Agoric/agoric-sdk/issues/4069)) ([fe9a9ff](https://github.com/Agoric/agoric-sdk/commit/fe9a9ff3de86608a0b1f8f9547059f89d45b948d))
* default to disallowing implicit remotables ([#3736](https://github.com/Agoric/agoric-sdk/issues/3736)) ([d14a665](https://github.com/Agoric/agoric-sdk/commit/d14a66548f3981334f9738bbca3b906901c2e657))
* fix missing Fars in pools ([#3975](https://github.com/Agoric/agoric-sdk/issues/3975)) ([b5bfb3e](https://github.com/Agoric/agoric-sdk/commit/b5bfb3eec26bf1230ad8680f17045b17e3e305c6))
* if `makeEmptyPurse` fails, then `startInstance` and `saveIssuer` should fail ([#4070](https://github.com/Agoric/agoric-sdk/issues/4070)) ([c8c4aa9](https://github.com/Agoric/agoric-sdk/commit/c8c4aa92a7c11a58247d3784d573a2d05743ea72))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



## [0.20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.19.1...@agoric/zoe@0.20.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* add a claimsRegistrar based on attestations (#3622)

### Features

* add a claimsRegistrar based on attestations ([#3622](https://github.com/Agoric/agoric-sdk/issues/3622)) ([3acf78d](https://github.com/Agoric/agoric-sdk/commit/3acf78d786fedbc2fe02792383ebcc2cadaa8db2)), closes [#3189](https://github.com/Agoric/agoric-sdk/issues/3189) [#3473](https://github.com/Agoric/agoric-sdk/issues/3473) [#3932](https://github.com/Agoric/agoric-sdk/issues/3932)
* ContractGovernor manages parameter updating for a contract ([#3448](https://github.com/Agoric/agoric-sdk/issues/3448)) ([59ebde2](https://github.com/Agoric/agoric-sdk/commit/59ebde27708c0b3988f62a3626f9b092e148671f))


### Bug Fixes

* Increase default initial computrons for Zoe contracts for zip archive support ([01c833e](https://github.com/Agoric/agoric-sdk/commit/01c833e5a6373fdcf17088a9747b6cef8ad178bb))



### [0.19.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.19.0...@agoric/zoe@0.19.1) (2021-09-23)


### Features

* **TimerService:** add new `delay` method and protect device args ([7a2c830](https://github.com/Agoric/agoric-sdk/commit/7a2c830b6cdea1e81cc0eb8fef517704dc30a922))


### Bug Fixes

* fix bug which breaks rights conservation and offer safety guarantees ([#3858](https://github.com/Agoric/agoric-sdk/issues/3858)) ([b67bfcb](https://github.com/Agoric/agoric-sdk/commit/b67bfcb9051cdcf780aff1a10653635448b21eae))
* **timer:** remove deprecated `createRepeater` ([b45c66d](https://github.com/Agoric/agoric-sdk/commit/b45c66d6d5aadcd91bd2e50d31104bce8d4d78f6))
* skip refill meter test ([#3849](https://github.com/Agoric/agoric-sdk/issues/3849)) ([90a456f](https://github.com/Agoric/agoric-sdk/commit/90a456f78f918ad01924da4b131f5a272d03624b))



## [0.19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.18.1...@agoric/zoe@0.19.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* add required rounding modes to ratio APIs

### Features

* add required rounding modes to ratio APIs ([dc8d6dc](https://github.com/Agoric/agoric-sdk/commit/dc8d6dca5898890ef4d956c83685bc28eb189791))


### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))
* update error messages in tests. ([76d590d](https://github.com/Agoric/agoric-sdk/commit/76d590d11d6c6798f1f334c7b477b056f312a1b7))



### [0.18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.18.0...@agoric/zoe@0.18.1) (2021-08-18)

**Note:** Version bump only for package @agoric/zoe





## [0.18.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.9...@agoric/zoe@0.18.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Bug Fixes

* **zoe:** relax createInvitationKit to take ERef<TimerService> ([250266b](https://github.com/Agoric/agoric-sdk/commit/250266befdff903396f507c1b13bab88b2128e18))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.17.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.8...@agoric/zoe@0.17.9) (2021-08-16)

**Note:** Version bump only for package @agoric/zoe





### [0.17.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.5...@agoric/zoe@0.17.8) (2021-08-15)


### Features

* Add private arguments to contract `start` functions, via E(zoe).startInstance ([#3576](https://github.com/Agoric/agoric-sdk/issues/3576)) ([f353e86](https://github.com/Agoric/agoric-sdk/commit/f353e86d33101365845597cb374d825fe08ff129))
* allow users to pass offerArgs with their offer ([#3578](https://github.com/Agoric/agoric-sdk/issues/3578)) ([cb1eea1](https://github.com/Agoric/agoric-sdk/commit/cb1eea1046f2de2ac90ea045eafad7c7de2afab6))


### Bug Fixes

* move the assertion that `allStagedSeatsUsed` into `reallocate` rather than `reallocateInternal` ([#3615](https://github.com/Agoric/agoric-sdk/issues/3615)) ([f8d62cc](https://github.com/Agoric/agoric-sdk/commit/f8d62cc889911f821e66a281aec5f680ed8e2628))

### 0.26.10 (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **zoe:** use metered=true and xs-worker on all swingset tests ([32967ca](https://github.com/Agoric/agoric-sdk/commit/32967cad79ec72d938de8a0308dd590fbc916d2a)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.17.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.5...@agoric/zoe@0.17.7) (2021-08-14)


### Features

* Add private arguments to contract `start` functions, via E(zoe).startInstance ([#3576](https://github.com/Agoric/agoric-sdk/issues/3576)) ([f353e86](https://github.com/Agoric/agoric-sdk/commit/f353e86d33101365845597cb374d825fe08ff129))
* allow users to pass offerArgs with their offer ([#3578](https://github.com/Agoric/agoric-sdk/issues/3578)) ([cb1eea1](https://github.com/Agoric/agoric-sdk/commit/cb1eea1046f2de2ac90ea045eafad7c7de2afab6))


### Bug Fixes

* move the assertion that `allStagedSeatsUsed` into `reallocate` rather than `reallocateInternal` ([#3615](https://github.com/Agoric/agoric-sdk/issues/3615)) ([f8d62cc](https://github.com/Agoric/agoric-sdk/commit/f8d62cc889911f821e66a281aec5f680ed8e2628))

### 0.26.10 (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **zoe:** use metered=true and xs-worker on all swingset tests ([32967ca](https://github.com/Agoric/agoric-sdk/commit/32967cad79ec72d938de8a0308dd590fbc916d2a)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.17.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.5...@agoric/zoe@0.17.6) (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* **zoe:** use metered=true and xs-worker on all swingset tests ([32967ca](https://github.com/Agoric/agoric-sdk/commit/32967cad79ec72d938de8a0308dd590fbc916d2a)), closes [#3518](https://github.com/Agoric/agoric-sdk/issues/3518) [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.17.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.4...@agoric/zoe@0.17.5) (2021-07-01)

**Note:** Version bump only for package @agoric/zoe





### [0.17.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.3...@agoric/zoe@0.17.4) (2021-06-28)

**Note:** Version bump only for package @agoric/zoe





### [0.17.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.2...@agoric/zoe@0.17.3) (2021-06-25)

**Note:** Version bump only for package @agoric/zoe





### [0.17.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.1...@agoric/zoe@0.17.2) (2021-06-24)

**Note:** Version bump only for package @agoric/zoe





### [0.17.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.17.0...@agoric/zoe@0.17.1) (2021-06-24)

**Note:** Version bump only for package @agoric/zoe





## [0.17.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.16.1...@agoric/zoe@0.17.0) (2021-06-23)


### ⚠ BREAKING CHANGES

* **zoe:** handle subtracting empty in a less fragile way (#3345)
* **zoe:** add method zcf.getInstance() (#3353)

### Code Refactoring

* **zoe:** add method zcf.getInstance() ([#3353](https://github.com/Agoric/agoric-sdk/issues/3353)) ([d8952c2](https://github.com/Agoric/agoric-sdk/commit/d8952c24d03ec7f2c26de9ed2a35c31c32a0a66c))
* **zoe:** handle subtracting empty in a less fragile way ([#3345](https://github.com/Agoric/agoric-sdk/issues/3345)) ([f51d327](https://github.com/Agoric/agoric-sdk/commit/f51d3270a8a59b4a5fdcac029f6f752fbad3ad59))



### [0.16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.16.0...@agoric/zoe@0.16.1) (2021-06-16)

**Note:** Version bump only for package @agoric/zoe





## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.7...@agoric/zoe@0.16.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **zoe:** new reallocate API to assist with reviewing conservation of rights (#3184)

### Features

* add invariant helper and constant product use example ([#3090](https://github.com/Agoric/agoric-sdk/issues/3090)) ([f533f76](https://github.com/Agoric/agoric-sdk/commit/f533f769c5ccc334a400fa57648e288f07be883c))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))


### Code Refactoring

* **zoe:** new reallocate API to assist with reviewing conservation of rights ([#3184](https://github.com/Agoric/agoric-sdk/issues/3184)) ([f34e5ea](https://github.com/Agoric/agoric-sdk/commit/f34e5eae0812a9823d40d2d05ba98522c7846f2a))



## [0.15.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.6...@agoric/zoe@0.15.7) (2021-05-10)

**Note:** Version bump only for package @agoric/zoe





## [0.15.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.5...@agoric/zoe@0.15.6) (2021-05-05)

**Note:** Version bump only for package @agoric/zoe





## [0.15.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.4...@agoric/zoe@0.15.5) (2021-05-05)


### Bug Fixes

* test and workaround for a reallocate issue in zoe ([f56ff7a](https://github.com/Agoric/agoric-sdk/commit/f56ff7a76587fc36bcaf5a88efe663b3b1f974e8))
* **newSwap:** move guard out of conditional; tests pass ([dc67e67](https://github.com/Agoric/agoric-sdk/commit/dc67e67a9feb131e2509db69359e0f258fdc5367))
* update types and implementation now that Far preserves them ([a4695c4](https://github.com/Agoric/agoric-sdk/commit/a4695c43a09abc92a20c12104cfbfefb4cae2ff2))
* **ERTP:** now that {} is data, always return a displayInfo object ([fcc0cc4](https://github.com/Agoric/agoric-sdk/commit/fcc0cc4e61daef103556589fe7003da99d3c4626))
* settle REMOTE_STYLE name ([#2900](https://github.com/Agoric/agoric-sdk/issues/2900)) ([3dc6638](https://github.com/Agoric/agoric-sdk/commit/3dc66385b85cb3e8a1056b8d6e64cd3e448c041f))
* **zoe:** use fs.mkdirSync properly ([d7a8a41](https://github.com/Agoric/agoric-sdk/commit/d7a8a41310448895751ba6e67537f03b307c46bb))
* remove incorrect assertion in multipoolAutoSwap priceAuthority ([#2839](https://github.com/Agoric/agoric-sdk/issues/2839)) ([cb022d6](https://github.com/Agoric/agoric-sdk/commit/cb022d678bb1468ac06c73495e5f98b1d556cc7a)), closes [#2831](https://github.com/Agoric/agoric-sdk/issues/2831)





## [0.15.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.3...@agoric/zoe@0.15.4) (2021-04-22)

**Note:** Version bump only for package @agoric/zoe





## [0.15.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.2...@agoric/zoe@0.15.3) (2021-04-18)

**Note:** Version bump only for package @agoric/zoe





## [0.15.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.1...@agoric/zoe@0.15.2) (2021-04-16)

**Note:** Version bump only for package @agoric/zoe





## [0.15.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.15.0...@agoric/zoe@0.15.1) (2021-04-14)

**Note:** Version bump only for package @agoric/zoe





# [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.14.1...@agoric/zoe@0.15.0) (2021-04-13)


### Features

* integrate pegasus in chain bootstrap ([5c7ecba](https://github.com/Agoric/agoric-sdk/commit/5c7ecba05d0e6ec7ef9fe127ee89e0c79d3e6511))





## [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.14.0...@agoric/zoe@0.14.1) (2021-04-07)

**Note:** Version bump only for package @agoric/zoe





# [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.13.1...@agoric/zoe@0.14.0) (2021-04-06)


### Bug Fixes

* don't start the fakePriceAuthority ticker for constant prices ([90a28c9](https://github.com/Agoric/agoric-sdk/commit/90a28c9fe2fb2c6041b94b171ad32cae5a663749))
* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric-sdk/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric-sdk/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* price requests for zero should get zero as an answer ([#2762](https://github.com/Agoric/agoric-sdk/issues/2762)) ([11285e7](https://github.com/Agoric/agoric-sdk/commit/11285e76044fec982f6657b21fcc3da9b5d263f9)), closes [#2760](https://github.com/Agoric/agoric-sdk/issues/2760)
* properly handle empty priceList/tradeList ([a1a2075](https://github.com/Agoric/agoric-sdk/commit/a1a20753ac4d54c3e4e269021a1dbb9ef9b83e8f))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric-sdk/issues/2709)) ([85b674e](https://github.com/Agoric/agoric-sdk/commit/85b674e7942443219fa9828841cc7bd8ef909b47))
* use SWINGSET_WORKER_TYPE to avoid WORKER_TYPE ambiguity ([c4616f1](https://github.com/Agoric/agoric-sdk/commit/c4616f1db0f2668eef5dbb97e30800d4e9caf3a0))
* **loan:** fix reallocate error in liquidation error recovery ([b50117f](https://github.com/Agoric/agoric-sdk/commit/b50117f0e300311fff24e13d66de0c92003e8ae7))


### Features

* add a method to multipoolAutoSwap to return the pool brands ([#2810](https://github.com/Agoric/agoric-sdk/issues/2810)) ([16755d0](https://github.com/Agoric/agoric-sdk/commit/16755d0b42be185b63190a832b0414fbd0b53797))
* use multipoolAutoswap as the treasury priceAuthority ([a37c795](https://github.com/Agoric/agoric-sdk/commit/a37c795a98f38ac99581d441e00177364f404bd3))





## [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.13.0...@agoric/zoe@0.13.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





# [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.12.1...@agoric/zoe@0.13.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* properly type assert.typeof(xxx, 'object') ([4958636](https://github.com/Agoric/agoric-sdk/commit/49586365607175fd9f91896a66cf02ad14d93055))
* **zoe:** add Far to periodObserver ([#2577](https://github.com/Agoric/agoric-sdk/issues/2577)) ([4c07722](https://github.com/Agoric/agoric-sdk/commit/4c0772262a4f6861836cc4e472e9c18d5219ad7f)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)
* **zoe:** annotate empty objects with Data or Far as appropriate ([7aaa6dc](https://github.com/Agoric/agoric-sdk/commit/7aaa6dccce257986f3e98241b670ee4cb8aae4ca)), closes [#2545](https://github.com/Agoric/agoric-sdk/issues/2545) [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))
* weaken timer wakers to ERefs ([dda396f](https://github.com/Agoric/agoric-sdk/commit/dda396fbef9c407cf5c151ebdb783954c678ee08))


### Features

* **ava-xs:** handle some zoe tests ([#2573](https://github.com/Agoric/agoric-sdk/issues/2573)) ([7789834](https://github.com/Agoric/agoric-sdk/commit/7789834f7d232e395a707c5117295b768ed3fcff)), closes [#2503](https://github.com/Agoric/agoric-sdk/issues/2503)
* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric-sdk/issues/2561)) ([1620307](https://github.com/Agoric/agoric-sdk/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))
* declarative environments import for SwingSet, zoe tests ([#2580](https://github.com/Agoric/agoric-sdk/issues/2580)) ([bb0e7d6](https://github.com/Agoric/agoric-sdk/commit/bb0e7d604a9d789f9df0c6863e79a039f3b2f052))





## [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.12.0...@agoric/zoe@0.12.1) (2021-02-22)

**Note:** Version bump only for package @agoric/zoe





# [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.11.0...@agoric/zoe@0.12.0) (2021-02-16)


### Bug Fixes

* add a test and correct the collateral check ([#2300](https://github.com/Agoric/agoric-sdk/issues/2300)) ([2396e4d](https://github.com/Agoric/agoric-sdk/commit/2396e4d354cdf19aa35316883377b03a44514f5e))
* Far and Remotable do unverified local marking rather than WeakMap ([#2361](https://github.com/Agoric/agoric-sdk/issues/2361)) ([ab59ab7](https://github.com/Agoric/agoric-sdk/commit/ab59ab779341b9740827b7c4cca4680e7b7212b2))
* multipoolAutoswap should throw seat.fail() when it can't comply ([#2337](https://github.com/Agoric/agoric-sdk/issues/2337)) ([0f02d52](https://github.com/Agoric/agoric-sdk/commit/0f02d52e5667d4cdaeb7c349ffa5826379335f4b)), closes [#2335](https://github.com/Agoric/agoric-sdk/issues/2335) [#2336](https://github.com/Agoric/agoric-sdk/issues/2336)
* multipoolAutoswap was calculating output prices incorrectly. ([#2166](https://github.com/Agoric/agoric-sdk/issues/2166)) ([60a4adf](https://github.com/Agoric/agoric-sdk/commit/60a4adf3976c5aeb407e479b136622b5b4793965))
* off-by-one: minimum positive result of getOutputPrice() is 1 ([#2198](https://github.com/Agoric/agoric-sdk/issues/2198)) ([82d68d9](https://github.com/Agoric/agoric-sdk/commit/82d68d91ad47453d85fdc9d023ed0e2faace184a))
* remove pointless excessive abstraction ([#2425](https://github.com/Agoric/agoric-sdk/issues/2425)) ([14285f5](https://github.com/Agoric/agoric-sdk/commit/14285f5d71dc37bbf8e90c4f26032805d39aeee6))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))


### Features

* add a notifier to the timerService ([#2143](https://github.com/Agoric/agoric-sdk/issues/2143)) ([3cb4606](https://github.com/Agoric/agoric-sdk/commit/3cb46063080dd4fac27507ad0062e54dbf82eda4))
* add displayInfo as a parameter to makeZcfMint. ([#2189](https://github.com/Agoric/agoric-sdk/issues/2189)) ([f5cb3b9](https://github.com/Agoric/agoric-sdk/commit/f5cb3b9f6ce44b94e9b7af6ec1677c5c7aaf73a6))
* refactor notification and subscription ([dd5f7f7](https://github.com/Agoric/agoric-sdk/commit/dd5f7f7fc5b6ae7f8bee4f123821d92a26581af4))





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.10.0...@agoric/zoe@0.11.0) (2020-12-10)


### Bug Fixes

* allow the priceAuthority to supply a null quotePayment ([9b038eb](https://github.com/Agoric/agoric-sdk/commit/9b038ebcf00d60fa41873d04010d5c600e8f59a7))
* minor tweaks for dapp-oracle ([b8169c1](https://github.com/Agoric/agoric-sdk/commit/b8169c1f39bc0c0d7c07099df2ac23ee7df05733))
* properly generate a quote for every timer tick ([0c18aae](https://github.com/Agoric/agoric-sdk/commit/0c18aaee67d4e1c530d632c3b69edbcca6ce8fb7))


### Features

* 2 parties can buy callSpread positions separately ([#2019](https://github.com/Agoric/agoric-sdk/issues/2019)) ([2b19988](https://github.com/Agoric/agoric-sdk/commit/2b1998804f8534db933e38f902b7b69bf3bad3cc))
* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* implement makeQuoteNotifier(amountIn, brandOut) ([3035203](https://github.com/Agoric/agoric-sdk/commit/3035203c4d9a8972f999690976822965cc9fc6bd))





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.10.0-dev.0...@agoric/zoe@0.10.0) (2020-11-07)


### Bug Fixes

* add more types and update APIs ([8b1c582](https://github.com/Agoric/agoric-sdk/commit/8b1c58297665f224018110317a3768587594121a))
* allow priceRegistry to force-override an entry ([dceafd6](https://github.com/Agoric/agoric-sdk/commit/dceafd6073b8ba6d43acbefafec68797eb365729))
* be resistent to rejected wake handlers ([cde3ce2](https://github.com/Agoric/agoric-sdk/commit/cde3ce2c93ea0288a8cfa3fbbd6fefb052127f50))
* enable type checking of zoe/tools and fix errors ([98f4637](https://github.com/Agoric/agoric-sdk/commit/98f46379605817442c4c9921e6f0ecf16616976e))
* encapsulate natSafeMath.isGTE ([658c223](https://github.com/Agoric/agoric-sdk/commit/658c223963d2953efe9eba77e27eb3f51c224f4d))
* have timer.tick return a promise that awaits the wake calls ([1707ea2](https://github.com/Agoric/agoric-sdk/commit/1707ea2ec73d441fa886ebdf4ef873d2a5849f6a))
* move makeQueryInvitation back to the publicFacet ([b73733b](https://github.com/Agoric/agoric-sdk/commit/b73733bee41a77f95c101b181198733a99ce0ddb))
* put all parsing and stringification into the wallet ui ([58ff9a3](https://github.com/Agoric/agoric-sdk/commit/58ff9a32f10778e76e379d8a81cabf655c26c580))
* stop suppressing contract evaluation errors ([#1887](https://github.com/Agoric/agoric-sdk/issues/1887)) ([96cd62f](https://github.com/Agoric/agoric-sdk/commit/96cd62f6acaa7444478c24cf8856f3da643480d3))
* use only embedded timer for `quoteAtTime` to gain performance ([8aa959a](https://github.com/Agoric/agoric-sdk/commit/8aa959a43d63cb45f01b1e3a18befd95ac41447f))


### Features

* a call spread option contract and tests. ([#1854](https://github.com/Agoric/agoric-sdk/issues/1854)) ([db0962b](https://github.com/Agoric/agoric-sdk/commit/db0962b605bc28dfb186a369f0eff6c4420ff382)), closes [#1829](https://github.com/Agoric/agoric-sdk/issues/1829) [#1928](https://github.com/Agoric/agoric-sdk/issues/1928)
* add `agoric.priceAuthority` via priceAuthorityRegistry ([c602d14](https://github.com/Agoric/agoric-sdk/commit/c602d1446e7b6b37016fafd1e013da2c28cacc76))
* add ceilDivide to safeMath ([259c08f](https://github.com/Agoric/agoric-sdk/commit/259c08f6699cadf8456a4f09ebb0b8c22db49057))
* add types and flesh out manualTimer ([e01c1b0](https://github.com/Agoric/agoric-sdk/commit/e01c1b0026cac44c05d7339657fbc0e5fb0be2df))
* convert the fakePriceAuthority to a PlayerPiano model ([#1985](https://github.com/Agoric/agoric-sdk/issues/1985)) ([cd7ebd8](https://github.com/Agoric/agoric-sdk/commit/cd7ebd86b1f37655b9213786ab6828dd6c7c098a))
* export extended @agoric/zoe/tools/manualTimer ([dbfa393](https://github.com/Agoric/agoric-sdk/commit/dbfa39369d5ec14a1701571062296de63830afe7))
* move oracle and priceAggregator contracts from dapp-oracle ([035603b](https://github.com/Agoric/agoric-sdk/commit/035603bb9caa143432a77ae99b845cd80b421948))
* record displayInfo in the issuerTable ([72a2137](https://github.com/Agoric/agoric-sdk/commit/72a2137e545c1bd3f47842c1b85c6d31e2b3b6a9))
* simple volatile priceAuthority ([af76585](https://github.com/Agoric/agoric-sdk/commit/af7658576f00b6ebaae3bd91aebc6d9fc983fa71))
* **assert:** Thread stack traces to console, add entangled assert ([#1884](https://github.com/Agoric/agoric-sdk/issues/1884)) ([5d4f35f](https://github.com/Agoric/agoric-sdk/commit/5d4f35f901f2ca40a2a4d66dab980a5fe8e575f4))
* **zoe:** add priceAuthorityRegistry ([02c6147](https://github.com/Agoric/agoric-sdk/commit/02c614731477ec62c6dca18165619c8dd37ecaea))





# [0.10.0-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.9.1...@agoric/zoe@0.10.0-dev.0) (2020-10-19)


### Features

* **zoe:** export src/contractFacet/fakeVatAdmin for dapps ([ea8568f](https://github.com/Agoric/agoric-sdk/commit/ea8568f7d2b67b10507d911c6585b1728ad3d011))





## [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.9.1-dev.2...@agoric/zoe@0.9.1) (2020-10-11)


### Bug Fixes

* improved error message when eventual send target is undefined ([#1847](https://github.com/Agoric/agoric-sdk/issues/1847)) ([f33d30e](https://github.com/Agoric/agoric-sdk/commit/f33d30e46eeb209f039e81a92350c06611cc45a1))
* update @agoric/store types and imports ([9e3493a](https://github.com/Agoric/agoric-sdk/commit/9e3493ad4d8c0a6a9230ad6a4c22a3254a867115))





## [0.9.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.9.1-dev.1...@agoric/zoe@0.9.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/zoe





## [0.9.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.9.1-dev.0...@agoric/zoe@0.9.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/zoe





## [0.9.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.9.0...@agoric/zoe@0.9.1-dev.0) (2020-09-18)


### Bug Fixes

* add check so that expected values must be null in assertProposalShape ([#1788](https://github.com/Agoric/agoric-sdk/issues/1788)) ([0de4bcd](https://github.com/Agoric/agoric-sdk/commit/0de4bcdeae1858041a20ab082b6ef1c4ada39ce2))
* assert keyword in getPayout ([#1790](https://github.com/Agoric/agoric-sdk/issues/1790)) ([e4ec018](https://github.com/Agoric/agoric-sdk/commit/e4ec018683ccf64195334c2146a2b72eb0f1f8c9))
* improve error messages for mintGains and burnLosses ([#1796](https://github.com/Agoric/agoric-sdk/issues/1796)) ([916f7ae](https://github.com/Agoric/agoric-sdk/commit/916f7ae26cefbf65e667fe499b270256c49c4676))
* saveAllIssuers doc says it ignores the brand for known keywords ([88675f5](https://github.com/Agoric/agoric-sdk/commit/88675f542526671edefbbd8677981fcf02bbc8a5))
* standardize whether keywords are quoted ([1fa44d9](https://github.com/Agoric/agoric-sdk/commit/1fa44d9ff7c7f8b317df442ba7a5893a95e49f7b))





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.8.1...@agoric/zoe@0.9.0) (2020-09-16)


### Bug Fixes

* add a default offerHandler ([#1759](https://github.com/Agoric/agoric-sdk/issues/1759)) ([d25052d](https://github.com/Agoric/agoric-sdk/commit/d25052d10aa6e863dd68e24e0a54c46be0e0352d))
* Add a seat in mintGains() if none is provided ([0efa57f](https://github.com/Agoric/agoric-sdk/commit/0efa57f86eff3f89567c8096f185c17549ad1ac0)), closes [#1696](https://github.com/Agoric/agoric-sdk/issues/1696)
* change 'Trade Successful' offerResult to 'Order Added' ([#1651](https://github.com/Agoric/agoric-sdk/issues/1651)) ([7da7f58](https://github.com/Agoric/agoric-sdk/commit/7da7f5809166315b9283fd3954b545789050d92e))
* Deadline type parameter ([4171e05](https://github.com/Agoric/agoric-sdk/commit/4171e054351657c7156341eec067c49a037559e3))
* don't make two round trips in order to perform checks in addPool ([a6efdab](https://github.com/Agoric/agoric-sdk/commit/a6efdabdbdff8bb772dc370e4bd6e48b26b91c06))
* exit zcfSeats immediately on shutdown. ([#1770](https://github.com/Agoric/agoric-sdk/issues/1770)) ([2409eb5](https://github.com/Agoric/agoric-sdk/commit/2409eb58f0784d7ca9f7110cf37a6a8706ee541b))
* kickOut does not throw itself ([#1663](https://github.com/Agoric/agoric-sdk/issues/1663)) ([9985dc4](https://github.com/Agoric/agoric-sdk/commit/9985dc4ef6d1f1e75bb722c8abd19eefc1479e36))
* lint was unhappy with the types on an array of mixed promises ([276e5fe](https://github.com/Agoric/agoric-sdk/commit/276e5fe01ca39a8d2d3dfefe0285bd7f1dd6da96))
* make brand optional in the types of `getAmountAllocated` ([#1760](https://github.com/Agoric/agoric-sdk/issues/1760)) ([3a98491](https://github.com/Agoric/agoric-sdk/commit/3a98491b3aebe20832cb982ebd6fc18b6c77058f))
* repair and add types for multipoolAutoSwap.getLiquidityIssuer() ([7c7bcca](https://github.com/Agoric/agoric-sdk/commit/7c7bcca9b05f098b878ae7cd79c047da3c6ade8c))
* revamp multipoolAutoswap: liquidity bug, in vs. out prices ([92bfdd5](https://github.com/Agoric/agoric-sdk/commit/92bfdd5ec6b4e17500999cec825c22e7abd1758f))
* simplify helper APIs ([#1732](https://github.com/Agoric/agoric-sdk/issues/1732)) ([068f4b1](https://github.com/Agoric/agoric-sdk/commit/068f4b141c21d2fdf9958e69f35a614fa0899da5))
* stop accepting offers if zcf.shutdown is called ([#1772](https://github.com/Agoric/agoric-sdk/issues/1772)) ([6ba171f](https://github.com/Agoric/agoric-sdk/commit/6ba171fb2aec659683c911b5aa4f97dfa8e2f20a))
* userSeat.hasExited was returning the opposite of its intent ([cdfc5e6](https://github.com/Agoric/agoric-sdk/commit/cdfc5e6aff4eba8a6ec02de3486637b75a67164c)), closes [#1729](https://github.com/Agoric/agoric-sdk/issues/1729)


### Features

* add `depositToSeat`, `withdrawFromSeat` ([#1680](https://github.com/Agoric/agoric-sdk/issues/1680)) ([fdbdded](https://github.com/Agoric/agoric-sdk/commit/fdbddedb3aa41b8538533368d3bdd1fe2fa3faff))
* allow Offer to accept a PaymentPKeywordRecord ([f5f9c41](https://github.com/Agoric/agoric-sdk/commit/f5f9c41b9eec519825c3b1940e3cc743f14056c5))





## [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.8.0...@agoric/zoe@0.8.1) (2020-08-31)


### Bug Fixes

* include exported.js in files list ([bd960c3](https://github.com/Agoric/agoric-sdk/commit/bd960c3b050862e998eec7fc838f14b1a2abb437))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.7.0...@agoric/zoe@0.8.0) (2020-08-31)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* add "TODO unimplemented"s ([#1580](https://github.com/Agoric/agoric-sdk/issues/1580)) ([7795f93](https://github.com/Agoric/agoric-sdk/commit/7795f9302843a2c94d4a2f42cb22affe1e91d41d))
* add shutdown() to atomicSwap, coveredCall, and sellItems. ([97dcd2e](https://github.com/Agoric/agoric-sdk/commit/97dcd2eab0a7150467c5776177f8cb879024bec9))
* add tests & fix for ZCF handling of crashes in contract code ([3cccf66](https://github.com/Agoric/agoric-sdk/commit/3cccf66cb85e91c6db10ed9530ec01f596e4cc8a))
* deduplicate redundant work ([#1550](https://github.com/Agoric/agoric-sdk/issues/1550)) ([b89651c](https://github.com/Agoric/agoric-sdk/commit/b89651c6355a058f97b4719be336a31a3ef273b4))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* kickOut takes a `reason` error rather than a `message` string ([#1567](https://github.com/Agoric/agoric-sdk/issues/1567)) ([c3cd536](https://github.com/Agoric/agoric-sdk/commit/c3cd536f16dcf30208d88fb1c81376aa916e2a40))
* many small review comments ([#1533](https://github.com/Agoric/agoric-sdk/issues/1533)) ([ee8f782](https://github.com/Agoric/agoric-sdk/commit/ee8f782578ff4f2ea9e0ec557e14d1f52c795ca9))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* one less unnecessary "then" ([#1623](https://github.com/Agoric/agoric-sdk/issues/1623)) ([8b22ad6](https://github.com/Agoric/agoric-sdk/commit/8b22ad6ba9f056bfe01a2daf5a02396e20c3b516))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename produceNotifier to makeNotifierKit ([#1330](https://github.com/Agoric/agoric-sdk/issues/1330)) ([e5034f9](https://github.com/Agoric/agoric-sdk/commit/e5034f94e33e9c90c6a8fcaff70c11773e13e969))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric-sdk/issues/1628)) ([1bae122](https://github.com/Agoric/agoric-sdk/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))
* set the simpleExchange notifier's initial order book state ([70c17fd](https://github.com/Agoric/agoric-sdk/commit/70c17fdffbdf84e9999aac962300ffc23698a8ca))
* should be typed ERef ([#1611](https://github.com/Agoric/agoric-sdk/issues/1611)) ([403eba3](https://github.com/Agoric/agoric-sdk/commit/403eba3afba1853773891f62af6c039d8b9d03c4))
* tweak more types, make getVatAdmin into a function ([8c1e9d2](https://github.com/Agoric/agoric-sdk/commit/8c1e9d21fbdb7fa652100d98d5fdb13ad406f03f))
* use itemsMath.isEmpty() rather than grovelling through value ([cdc09a1](https://github.com/Agoric/agoric-sdk/commit/cdc09a1bfa4c4818c447848ceb5da8f9551c6412))
* use kickOut() rather than exit() when the offer is turned down. ([44aee5b](https://github.com/Agoric/agoric-sdk/commit/44aee5b1da64cc2c24eda3d629d051e7c57896a5))
* **zoe:** don't [@typedef](https://github.com/typedef) areRightsConserved ([281f7b1](https://github.com/Agoric/agoric-sdk/commit/281f7b1413e570b3a2f7fa9509c74f22030b3936))
* **zoe:** unify InstanceRecord usage (.instanceHandle -> .handle) ([9af7903](https://github.com/Agoric/agoric-sdk/commit/9af790322fc84a3aa1e41e957614fea2873c63b1))
* update JS typings ([20941e6](https://github.com/Agoric/agoric-sdk/commit/20941e675302ee5905e4825638e661065ad5d3f9))


### Features

* adaptors between notifiers and async iterables ([#1340](https://github.com/Agoric/agoric-sdk/issues/1340)) ([b67d21a](https://github.com/Agoric/agoric-sdk/commit/b67d21aae7e66202e3a5a3f13c7bd5769061230e))
* add getIssuerForBrand to zoe ([#1276](https://github.com/Agoric/agoric-sdk/issues/1276)) ([4fe3c83](https://github.com/Agoric/agoric-sdk/commit/4fe3c83a70000cb9f933bf6e158cc2bc1862bae9))
* add want, exit to empty seat ([#1584](https://github.com/Agoric/agoric-sdk/issues/1584)) ([ae303e1](https://github.com/Agoric/agoric-sdk/commit/ae303e1d15ee467876f708d8d91b6cd7d5d4e640))
* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)
* make production Zoe use prebundled zcf ([138ddd7](https://github.com/Agoric/agoric-sdk/commit/138ddd70cba6e1b11a4a8c0d59f15a018f8bb0e6))
* Zoe support for prebundled zcf ([60050a5](https://github.com/Agoric/agoric-sdk/commit/60050a5be51ebe47ae1365fe134a4ea222b010c0))





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.2...@agoric/zoe@0.7.0) (2020-06-30)


### Bug Fixes

* ensure keywords do not collide with numbers ([#1133](https://github.com/Agoric/agoric-sdk/issues/1133)) ([15623f3](https://github.com/Agoric/agoric-sdk/commit/15623f333928dc57fc07085f246a419f916ef4c0))
* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))





## [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.1...@agoric/zoe@0.6.2) (2020-05-17)


### Bug Fixes

* fix typedef for makeInstance (was erroring incorrectly) and give better error message for an invalid installationHandle ([#1109](https://github.com/Agoric/agoric-sdk/issues/1109)) ([4b352fc](https://github.com/Agoric/agoric-sdk/commit/4b352fc7f399a479d82181158d4d61e63790b31f))
* fix Zoe bug in which offer safety can be violated ([#1115](https://github.com/Agoric/agoric-sdk/issues/1115)) ([39d6ae2](https://github.com/Agoric/agoric-sdk/commit/39d6ae26dd1aaec737ae0f9a47af5c396868c188)), closes [#1076](https://github.com/Agoric/agoric-sdk/issues/1076)





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.0...@agoric/zoe@0.6.1) (2020-05-10)


### Bug Fixes

* filter proposal give and want by sparseKeywords in zcf.reallocate ([#1076](https://github.com/Agoric/agoric-sdk/issues/1076)) ([fb36a40](https://github.com/Agoric/agoric-sdk/commit/fb36a406e628765376797ab3663272402d3584b3))





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.5.0...@agoric/zoe@0.6.0) (2020-05-04)


### Bug Fixes

* demonstrate and fix a bug with mis-spelled liquidityTokenSupply ([2161b42](https://github.com/Agoric/agoric-sdk/commit/2161b422ccb23f338d500fb60bba71a51bf3b670))
* improve handling of orders that are consummated immediately ([61e4b67](https://github.com/Agoric/agoric-sdk/commit/61e4b673014b81d8336d64059eb9a1ea46629eae)), closes [#13](https://github.com/Agoric/agoric-sdk/issues/13)
* throw if values are undefined ([7be77e5](https://github.com/Agoric/agoric-sdk/commit/7be77e5b39d70ae5d2da704ce8b5f575ec66059e))
* **assert:** slightly better assert logging ([#919](https://github.com/Agoric/agoric-sdk/issues/919)) ([47b3729](https://github.com/Agoric/agoric-sdk/commit/47b3729aa6b4ebde0d23cf791c5295fcf8f58a00))
* **zoe:** separate inviteHandle vs offerHandle ([#942](https://github.com/Agoric/agoric-sdk/issues/942)) ([1d85f97](https://github.com/Agoric/agoric-sdk/commit/1d85f97850ead03ac8e62c6e76405467914a2e84))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))
* **zoe:** Invitation to offer refactored to use upcall ([#853](https://github.com/Agoric/agoric-sdk/issues/853)) ([c142b7a](https://github.com/Agoric/agoric-sdk/commit/c142b7a64e77262927da22bde3af5793a9d39c2a))


### Features

* Add a notifier facility for Zoe and contracts ([335e009](https://github.com/Agoric/agoric-sdk/commit/335e00915bf37b2232cbcce8d15fb188bc70b0d6))
* connect notifier to wallet for SimpleExchange ([6d270f8](https://github.com/Agoric/agoric-sdk/commit/6d270f87a1788ad08526f929fc8165eaf7a61e3b))
* rename the registrar to be registry in "home" ([7603edb](https://github.com/Agoric/agoric-sdk/commit/7603edb8abed8573282337a66f6af506e8715f8c))
* SimpleExchange use notifier to announce changes to book orders ([efdd214](https://github.com/Agoric/agoric-sdk/commit/efdd214c705b099d499e039673d58f5e7584ab17))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.5.0-alpha.0...@agoric/zoe@0.5.0) (2020-04-13)

**Note:** Version bump only for package @agoric/zoe





# [0.5.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.4.0...@agoric/zoe@0.5.0-alpha.0) (2020-04-12)


### Bug Fixes

* increase level of contract console.log to console.info ([00156f2](https://github.com/Agoric/agoric-sdk/commit/00156f235abb1b87db1c5ab0bd5155c2f3615382))
* **zoe:** ensure offers have the same instance handle as the contract calling the contract facet method ([#910](https://github.com/Agoric/agoric-sdk/issues/910)) ([0ffe65f](https://github.com/Agoric/agoric-sdk/commit/0ffe65faa5baccb114d0d91540cd9578606d7646))
* revive the ability of a zoe client to get access to the code. ([1ad9265](https://github.com/Agoric/agoric-sdk/commit/1ad926519cc6ca14aadc2a328d89f0d400a8bc95)), closes [#877](https://github.com/Agoric/agoric-sdk/issues/877)
* update checkIfProposal and rejectIfNotProposal ([7cdf09d](https://github.com/Agoric/agoric-sdk/commit/7cdf09dec9740a167c4c1d5770e82774961a5ae0))
* **zoe:** improve assertSubset error message ([#873](https://github.com/Agoric/agoric-sdk/issues/873)) ([4c6f11f](https://github.com/Agoric/agoric-sdk/commit/4c6f11f1931342fd09b3170183e3df77bed0d678))


### Features

* allow sparse keywords ([#812](https://github.com/Agoric/agoric-sdk/issues/812)) ([dcc9ba3](https://github.com/Agoric/agoric-sdk/commit/dcc9ba3413d096c78df9f8b184991c3bfd83ace3)), closes [#391](https://github.com/Agoric/agoric-sdk/issues/391)
* Check that makeInstance() returns an actual invite ([546d2ef](https://github.com/Agoric/agoric-sdk/commit/546d2ef69ca8e2c2c3ad17c0b78083b281cb3a9a)), closes [#820](https://github.com/Agoric/agoric-sdk/issues/820)





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.4.0-alpha.0...@agoric/zoe@0.4.0) (2020-04-02)

**Note:** Version bump only for package @agoric/zoe





# [0.4.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.3.0...@agoric/zoe@0.4.0-alpha.0) (2020-04-02)


### Features

* allow optional arguments to redeem ([e930944](https://github.com/Agoric/agoric-sdk/commit/e930944390cc85ce287a87c25005e76891fa92d1))





# 0.3.0 (2020-03-26)


### Bug Fixes

* address PR comments ([b9ed6b5](https://github.com/Agoric/agoric-sdk/commit/b9ed6b5a510433af968ba233d4e943b939defa1b))
* propagate makeContract exceptions ([9a3cc18](https://github.com/Agoric/agoric-sdk/commit/9a3cc187b7ee75c446610cc3a101dfd0f557ea66))
* reinstate console endowment needed for Zoe contract debugging ([851d1ec](https://github.com/Agoric/agoric-sdk/commit/851d1ec78bba30c70571f400c8525c654338c641))
* revert Zoe change ([#775](https://github.com/Agoric/agoric-sdk/issues/775)) ([9212818](https://github.com/Agoric/agoric-sdk/commit/9212818d71e0906a7be343eda6acd37e634008be))
* wait for payments at opportune moments ([53f359d](https://github.com/Agoric/agoric-sdk/commit/53f359d56c49ef62a90e1e834b359de8ca5dfa4f))
* **metering:** properly reset for each crank ([ba191fe](https://github.com/Agoric/agoric-sdk/commit/ba191fe3435905e3d2ea5ab016571d1943d84bec))
* **metering:** refactor names and implementation ([f1410f9](https://github.com/Agoric/agoric-sdk/commit/f1410f91fbee61903e82a81368675eef4fa0b836))


### Features

* make ERTP methods acccept promises or payments ([4b7f060](https://github.com/Agoric/agoric-sdk/commit/4b7f06048bb0f86c2028a9c9cfae8ff90b595bd7))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/agoric-sdk/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **spawner:** implement basic metering ([8bd495c](https://github.com/Agoric/agoric-sdk/commit/8bd495ce64ab20a4f7e78999846afe1f9bce96a4))
* **zoe:** implement metering of contracts ([9138801](https://github.com/Agoric/agoric-sdk/commit/91388010a4c78741f27896d21df8e610c3ff3b16))
