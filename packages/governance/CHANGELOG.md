# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.10.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.10.2...@agoric/governance@0.10.3) (2023-06-09)

**Note:** Version bump only for package @agoric/governance





### [0.10.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.10.1...@agoric/governance@0.10.2) (2023-06-02)

**Note:** Version bump only for package @agoric/governance





### [0.10.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.10.0...@agoric/governance@0.10.1) (2023-05-24)

**Note:** Version bump only for package @agoric/governance





## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.9.1...@agoric/governance@0.10.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* **governance:** remove getContractGovernor
* rename 'fit' to 'mustMatch'

### Features

* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **committee:** durable facets ([e8f6279](https://github.com/Agoric/agoric-sdk/commit/e8f6279c3e9381f87340f99d5a419f6015d33c64))
* **contractHelper:** support upgradable contracts ([1baec94](https://github.com/Agoric/agoric-sdk/commit/1baec94da8f1d1f259ba63ed2cc1894403609219))
* **governance:** compatibility with upgrade ([1912d18](https://github.com/Agoric/agoric-sdk/commit/1912d18a98cc3fbbc6756c12c8b843bc76de0ad6))
* **governance:** label voteCounter with deadline ([7e4ae92](https://github.com/Agoric/agoric-sdk/commit/7e4ae92aa2a8a4146629c996b16ac02947e1aa0e))
* **governance:** vote counters for 2 or more options ([#6515](https://github.com/Agoric/agoric-sdk/issues/6515)) ([7997111](https://github.com/Agoric/agoric-sdk/commit/7997111665d21e660b9639300d01cc9b7bfa4cb8))
* **governor:** saves instance kit ([305354d](https://github.com/Agoric/agoric-sdk/commit/305354d12a379ed82c49c2f1ade1b579eaca7383))
* **governor:** upgradable ([9a1a9c1](https://github.com/Agoric/agoric-sdk/commit/9a1a9c117e3819115544f729c6774b5071083458))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* label governed contracts ([d60e015](https://github.com/Agoric/agoric-sdk/commit/d60e015581148d8222b3a30b9a990b484f78e9dc))
* **price:** addOracles by EC ([9b6dbc5](https://github.com/Agoric/agoric-sdk/commit/9b6dbc5816d9eadaf5800090d060dda73a0d2e8d))
* puppetGovernance setup tools ([7ed591b](https://github.com/Agoric/agoric-sdk/commit/7ed591b7f96abbe8a0aedc10b2d10a229942b6c0))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **types:** paramterize Instance ([8d1832a](https://github.com/Agoric/agoric-sdk/commit/8d1832a8001ccd98339d68856b0756cad25462d4))


### Bug Fixes

* **governance:** governor adminFacet handling ([785950a](https://github.com/Agoric/agoric-sdk/commit/785950ac02dbff9c9948f11d38f35924b0f36a9b))
* handle branded TimestampRecord in solo/store/agoric-cli/governance ([8369dd6](https://github.com/Agoric/agoric-sdk/commit/8369dd6a47e7e6c1c799a131fc38f340f0018b38))
* nextAuction timing when startFrequency is reduced ([#7415](https://github.com/Agoric/agoric-sdk/issues/7415)) ([ad87770](https://github.com/Agoric/agoric-sdk/commit/ad87770a9b629c089937e48d26601441ae949e47))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* update all clients of @agoric/time to handle the new home ([5c4fb24](https://github.com/Agoric/agoric-sdk/commit/5c4fb241940c74be6b081718b9350bceba95b9cd))
* update types/dependencies for new @agoric/time ([418545a](https://github.com/Agoric/agoric-sdk/commit/418545ae88085de6e7fde415baa7de0a3f3056a4))
* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric-sdk/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **governApi:** harden returns ([eee09d4](https://github.com/Agoric/agoric-sdk/commit/eee09d4d2c29a962006cb52d82e568e4bd8896d8))
* **tools:** puppetContractGovernor types ([5947838](https://github.com/Agoric/agoric-sdk/commit/5947838da2a99e5c71cff968b3c86d948b9f2b3a))
* **types:** fix some governance types ([a681988](https://github.com/Agoric/agoric-sdk/commit/a681988da45859374e2a6f9bb731ccb5391aa754))


### Miscellaneous Chores

* **governance:** remove getContractGovernor ([92fa9a2](https://github.com/Agoric/agoric-sdk/commit/92fa9a262b1b190d8535f826197a5df0c1ba9958))
* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.9.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.9.2...@agoric/governance@0.9.3) (2023-02-17)

**Note:** Version bump only for package @agoric/governance





### [0.9.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.9.1...@agoric/governance@0.9.2) (2022-12-14)

**Note:** Version bump only for package @agoric/governance





### [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.9.0...@agoric/governance@0.9.1) (2022-10-18)

**Note:** Version bump only for package @agoric/governance





## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.8.1...@agoric/governance@0.9.0) (2022-10-08)


### Features

* **governance:** replaceElectorate ([12de09e](https://github.com/Agoric/agoric-sdk/commit/12de09e03a6f52c77f2453a006164f151a2c13af))


### Bug Fixes

* strike "Initial" from Economic Committee ([0f3ce16](https://github.com/Agoric/agoric-sdk/commit/0f3ce1695635551b800f04e0e232d25e16c8f562))



### [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.8.0...@agoric/governance@0.8.1) (2022-10-05)

**Note:** Version bump only for package @agoric/governance





## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.7.0...@agoric/governance@0.8.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move some util where they are more reusable (#5990)
* **governance:** require publisherKit to make paramManager

### Features

* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric-sdk/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric-sdk/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* publish vote results from the voteCounter ([#6204](https://github.com/Agoric/agoric-sdk/issues/6204)) ([7645df0](https://github.com/Agoric/agoric-sdk/commit/7645df0e3c4b8ae901ea78e82b34a224ffaf1c2a))
* **governance:** questions to off-chain storage ([5bf276b](https://github.com/Agoric/agoric-sdk/commit/5bf276b79d062c05a43666f4fc8622c177b53d2f))
* **governance:** return completedBallet ([22166fa](https://github.com/Agoric/agoric-sdk/commit/22166faa9a5453c2d7a1ffda277806bb27a324b6))
* **governance:** subscriptions use off-chain storage ([67ebf6d](https://github.com/Agoric/agoric-sdk/commit/67ebf6dfe24a13d8ea299cdffa431d5ac0e2af52))
* **inter-protocol:** support committee question publishing ([91dec79](https://github.com/Agoric/agoric-sdk/commit/91dec791d7c77c6a92263951ffbb0aaa7c7ebfbe))
* **psm:** far class and guard patterns ([#6119](https://github.com/Agoric/agoric-sdk/issues/6119)) ([11a17d3](https://github.com/Agoric/agoric-sdk/commit/11a17d3cf006cb097d80061234398021109dbd94)), closes [#6129](https://github.com/Agoric/agoric-sdk/issues/6129) [#6135](https://github.com/Agoric/agoric-sdk/issues/6135)
* add a continuing invitation to the voter facet ([#6092](https://github.com/Agoric/agoric-sdk/issues/6092)) ([f53470e](https://github.com/Agoric/agoric-sdk/commit/f53470ede1e58e6aebc1c4db7da4c8ecefa8b46f))
* charter for the PSM, enabling governance ([#6090](https://github.com/Agoric/agoric-sdk/issues/6090)) ([e80b763](https://github.com/Agoric/agoric-sdk/commit/e80b7639e45647d54873c5d24ab9e98bd47b9679))
* save PSM adminFacet in bootstrap ([#6101](https://github.com/Agoric/agoric-sdk/issues/6101)) ([14b20e6](https://github.com/Agoric/agoric-sdk/commit/14b20e6054703240754695ba3ba385d0e954d41c))


### Bug Fixes

* **governance:** no electorateInstance term ([abd9ed7](https://github.com/Agoric/agoric-sdk/commit/abd9ed7887d74ada1657106841c28ff673be34fb))
* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* committee exit the seat when giving voter invitation ([a8f3650](https://github.com/Agoric/agoric-sdk/commit/a8f3650052802833227de8d1bcf30d8bc7a46ac6)), closes [#5483](https://github.com/Agoric/agoric-sdk/issues/5483)
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* rewrite zoe/tools/manualTimer.js, update tests ([0b5df16](https://github.com/Agoric/agoric-sdk/commit/0b5df16f83629efb7cb48d54250139e082ed109c))
* shutdown controller after tests ([93191e3](https://github.com/Agoric/agoric-sdk/commit/93191e33783f6a3286b55e3496fa0d7024690dd1))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))


### Code Refactoring

* **governance:** require publisherKit to make paramManager ([29f728a](https://github.com/Agoric/agoric-sdk/commit/29f728aaad711facbbd03b768d6aac083f43e21c))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.6.0...@agoric/governance@0.7.0) (2022-05-28)


### Features

* **vault:** liquidation penalty handled by liquidation contracts ([#5343](https://github.com/Agoric/agoric-sdk/issues/5343)) ([ce1cfaf](https://github.com/Agoric/agoric-sdk/commit/ce1cfafb6d375453865062e1bd66ade66fb80686))



## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.5.0...@agoric/governance@0.6.0) (2022-05-09)


### Features

* add governance for RECORDS as a parameter type ([#5273](https://github.com/Agoric/agoric-sdk/issues/5273)) ([82ffc23](https://github.com/Agoric/agoric-sdk/commit/82ffc23f5516738b22b2ef8bc0f4fe2850c3f35c)), closes [#5216](https://github.com/Agoric/agoric-sdk/issues/5216)
* **vault:** governance upgrade of liquidation ([#5211](https://github.com/Agoric/agoric-sdk/issues/5211)) ([35e1b7d](https://github.com/Agoric/agoric-sdk/commit/35e1b7d0b7df2508adf0d46a83944e94ab95951a))
* **vault:** Liquidate incrementally ([#5129](https://github.com/Agoric/agoric-sdk/issues/5129)) ([b641269](https://github.com/Agoric/agoric-sdk/commit/b64126996d4844c07016deadc87269dc387c4aae))


### Bug Fixes

* **governance:** fix test result order ([c4f7a3e](https://github.com/Agoric/agoric-sdk/commit/c4f7a3ed0ec7a0a1aa138dd85ec5973b949ed661))
* reconcile use of path to paramManager vaults with others ([#5151](https://github.com/Agoric/agoric-sdk/issues/5151)) ([b5d1439](https://github.com/Agoric/agoric-sdk/commit/b5d14393d407a7d7dca42ff5e41d374613168cbc))
* repair types left as <any> ([#5159](https://github.com/Agoric/agoric-sdk/issues/5159)) ([0eaa0b1](https://github.com/Agoric/agoric-sdk/commit/0eaa0b1226b2a49b3b05ce00e19b7ab7cc830f35))



## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.3...@agoric/governance@0.5.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* atomically update multiple parameters via governance (#5063)
* add the ability to invoke an API to contract governance (#4869)

### Features

* **run-protocol:** charge penalty for liquidation ([#4996](https://github.com/Agoric/agoric-sdk/issues/4996)) ([5467be4](https://github.com/Agoric/agoric-sdk/commit/5467be4fb5c4cc47f34736eb669e207b26eb711d))
* add the ability to invoke an API to contract governance ([#4869](https://github.com/Agoric/agoric-sdk/issues/4869)) ([3123665](https://github.com/Agoric/agoric-sdk/commit/312366518471238430c79313f79e57aee1c551cd)), closes [#4188](https://github.com/Agoric/agoric-sdk/issues/4188)


### Bug Fixes

* virtualize payments, purses, ledger ([#4618](https://github.com/Agoric/agoric-sdk/issues/4618)) ([dfeda1b](https://github.com/Agoric/agoric-sdk/commit/dfeda1bd7d8ca954b139d8dedda0624b924b8d81))


### Code Refactoring

* atomically update multiple parameters via governance ([#5063](https://github.com/Agoric/agoric-sdk/issues/5063)) ([8921f59](https://github.com/Agoric/agoric-sdk/commit/8921f59bcdf217b311670c509b8500074eafd77a))



### [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.2...@agoric/governance@0.4.3) (2022-02-24)

**Note:** Version bump only for package @agoric/governance





### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.1...@agoric/governance@0.4.2) (2022-02-21)


### Bug Fixes

* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))



### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.0...@agoric/governance@0.4.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))



## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.3.0...@agoric/governance@0.4.0) (2021-12-02)


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



## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.3...@agoric/governance@0.3.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* add a claimsRegistrar based on attestations (#3622)

### Features

* add a claimsRegistrar based on attestations ([#3622](https://github.com/Agoric/agoric-sdk/issues/3622)) ([3acf78d](https://github.com/Agoric/agoric-sdk/commit/3acf78d786fedbc2fe02792383ebcc2cadaa8db2)), closes [#3189](https://github.com/Agoric/agoric-sdk/issues/3189) [#3473](https://github.com/Agoric/agoric-sdk/issues/3473) [#3932](https://github.com/Agoric/agoric-sdk/issues/3932)
* ContractGovernor manages parameter updating for a contract ([#3448](https://github.com/Agoric/agoric-sdk/issues/3448)) ([59ebde2](https://github.com/Agoric/agoric-sdk/commit/59ebde27708c0b3988f62a3626f9b092e148671f))


### Bug Fixes

* **governance:** export buildParamManager from index.js ([#3952](https://github.com/Agoric/agoric-sdk/issues/3952)) ([868964e](https://github.com/Agoric/agoric-sdk/commit/868964e09cac570cceda4617fd0723a0a64d1841))



### [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.2...@agoric/governance@0.2.3) (2021-09-23)

**Note:** Version bump only for package @agoric/governance





### [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.1...@agoric/governance@0.2.2) (2021-09-15)


### Bug Fixes

* better type declarations caught some non-bigInts ([1668094](https://github.com/Agoric/agoric-sdk/commit/1668094138e0819c56f578d544ba0a24b1c82443))
* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.0...@agoric/governance@0.2.1) (2021-08-18)

**Note:** Version bump only for package @agoric/governance





## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.10...@agoric/governance@0.2.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.1.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.9...@agoric/governance@0.1.10) (2021-08-16)

**Note:** Version bump only for package @agoric/governance





### [0.1.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.9) (2021-08-15)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.8) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.7) (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.5...@agoric/governance@0.1.6) (2021-07-01)

**Note:** Version bump only for package @agoric/governance





### [0.1.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.4...@agoric/governance@0.1.5) (2021-06-28)

**Note:** Version bump only for package @agoric/governance





### [0.1.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.3...@agoric/governance@0.1.4) (2021-06-25)

**Note:** Version bump only for package @agoric/governance





### [0.1.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.2...@agoric/governance@0.1.3) (2021-06-24)

**Note:** Version bump only for package @agoric/governance





### [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.1...@agoric/governance@0.1.2) (2021-06-24)

**Note:** Version bump only for package @agoric/governance





### 0.1.1 (2021-06-23)


### Features

* ballot counter for two-outcome elections ([#3233](https://github.com/Agoric/agoric-sdk/issues/3233)) ([6dddaa6](https://github.com/Agoric/agoric-sdk/commit/6dddaa617f1e0188e8f6f0f4660ddc7f746f60c9)), closes [#3185](https://github.com/Agoric/agoric-sdk/issues/3185)
