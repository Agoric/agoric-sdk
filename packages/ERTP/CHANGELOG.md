# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.16.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.16.1...@agoric/ertp@0.16.2) (2023-06-02)

**Note:** Version bump only for package @agoric/ertp





### [0.16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.16.0...@agoric/ertp@0.16.1) (2023-05-24)

**Note:** Version bump only for package @agoric/ertp





## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.3...@agoric/ertp@0.16.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* rename 'fit' to 'mustMatch'

### Features

* **ERTP:** hasIssuer(baggage) ([a2c0283](https://github.com/Agoric/agoric-sdk/commit/a2c02839fb2a657b896b83c3da3dad0cb4692502))
* NotifierShape ([1b53522](https://github.com/Agoric/agoric-sdk/commit/1b535224231463a521f42c96d30018812e923f7b))
* RatioShape ([3efc7de](https://github.com/Agoric/agoric-sdk/commit/3efc7de9f13be002fa4080bb1dc0a05520b0bbf5))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))


### Bug Fixes

* **ERTP:** `getCurrentAmountNotifier` returns a `LatestTopic` ([735d005](https://github.com/Agoric/agoric-sdk/commit/735d005ec4f4087a4055d48ff1dd1801c9a3d836))
* collection type param defaults ([7c529b0](https://github.com/Agoric/agoric-sdk/commit/7c529b0c84a6cc76ac81a455b7b3bb8185ecbbfa))
* incomparables have no min or max ([#6764](https://github.com/Agoric/agoric-sdk/issues/6764)) ([229708b](https://github.com/Agoric/agoric-sdk/commit/229708bcc66afa53dbab929ce1826787942179f7))
* remove deprecated issuer payment methods ([#7113](https://github.com/Agoric/agoric-sdk/issues/7113)) ([978894a](https://github.com/Agoric/agoric-sdk/commit/978894a87b526efe9c87b2832030b7beee907b31))
* **zoe:** payments more recoverable ([#7112](https://github.com/Agoric/agoric-sdk/issues/7112)) ([ce7244d](https://github.com/Agoric/agoric-sdk/commit/ce7244d6cf23f57e6de73b5d119e9681456fded7))
* missing zcfMint options ([753ea03](https://github.com/Agoric/agoric-sdk/commit/753ea03d713f791bebeea82422d659ffc46bca80))
* prepare for patterns to schematize storage ([#6819](https://github.com/Agoric/agoric-sdk/issues/6819)) ([f0bd3d6](https://github.com/Agoric/agoric-sdk/commit/f0bd3d62c9e480b102fc077997c65d89c0488fa8))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* swingset should define these types, not zoe/ERTP ([35a977b](https://github.com/Agoric/agoric-sdk/commit/35a977b2fa3c03bd5292718e318a26e897ff3d04))


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.15.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.4...@agoric/ertp@0.15.5) (2023-02-17)

**Note:** Version bump only for package @agoric/ertp





### [0.15.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.3...@agoric/ertp@0.15.4) (2022-12-14)

**Note:** Version bump only for package @agoric/ertp





### [0.15.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.2...@agoric/ertp@0.15.3) (2022-10-18)

**Note:** Version bump only for package @agoric/ertp





### [0.15.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.1...@agoric/ertp@0.15.2) (2022-10-08)

**Note:** Version bump only for package @agoric/ertp





### [0.15.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.15.0...@agoric/ertp@0.15.1) (2022-10-05)

**Note:** Version bump only for package @agoric/ertp





## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.14.2...@agoric/ertp@0.15.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **store:** move some util where they are more reusable (#5990)

### Features

* make PSM bootstrap support multiple brands ([#6146](https://github.com/Agoric/agoric-sdk/issues/6146)) ([d9583f8](https://github.com/Agoric/agoric-sdk/commit/d9583f88fe98eaa16b5d5147f33a99f0722453e1)), closes [#6142](https://github.com/Agoric/agoric-sdk/issues/6142) [#6139](https://github.com/Agoric/agoric-sdk/issues/6139)


### Bug Fixes

* align issuer declaration order ([#6012](https://github.com/Agoric/agoric-sdk/issues/6012)) ([84f0198](https://github.com/Agoric/agoric-sdk/commit/84f0198aa596591d574a7b218b84b73889574cc7))
* better mismatch errors ([#5947](https://github.com/Agoric/agoric-sdk/issues/5947)) ([46e34f6](https://github.com/Agoric/agoric-sdk/commit/46e34f6deb7e5d8210a227bdea32fe3e2296e9ef))
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* bug in M.setOf and M.bagOf ([#5952](https://github.com/Agoric/agoric-sdk/issues/5952)) ([c940736](https://github.com/Agoric/agoric-sdk/commit/c940736dae49a1d3095194839dae355d4db2a67f))
* correct input validation of displayInfo ([#5876](https://github.com/Agoric/agoric-sdk/issues/5876)) ([7488530](https://github.com/Agoric/agoric-sdk/commit/74885306b09df45783dee8e63e97daa817cb0d9b)), closes [#5898](https://github.com/Agoric/agoric-sdk/issues/5898)
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* Make pattern matching faster ([#6158](https://github.com/Agoric/agoric-sdk/issues/6158)) ([9a2b427](https://github.com/Agoric/agoric-sdk/commit/9a2b427416e5e17a63cfa7c90dfa674741365d24))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* schema limit minting and offers ([#5461](https://github.com/Agoric/agoric-sdk/issues/5461)) ([dc7baa1](https://github.com/Agoric/agoric-sdk/commit/dc7baa195281f6442cfc28d0984adf0cf0d2341b))
* shutdown controller after tests ([93191e3](https://github.com/Agoric/agoric-sdk/commit/93191e33783f6a3286b55e3496fa0d7024690dd1))
* **ERTP:** limit decimal places to shift by (-100,100) ([8a154b8](https://github.com/Agoric/agoric-sdk/commit/8a154b8ebbc4c1abb2ca867daf139464765f80d3))


### Code Refactoring

* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



### [0.14.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.14.1...@agoric/ertp@0.14.2) (2022-05-28)

**Note:** Version bump only for package @agoric/ertp





### [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.14.0...@agoric/ertp@0.14.1) (2022-05-09)

**Note:** Version bump only for package @agoric/ertp





## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.13.3...@agoric/ertp@0.14.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)
* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **ertp:** support min/max for AmountMath ([#4474](https://github.com/Agoric/agoric-sdk/issues/4474)) ([05c3060](https://github.com/Agoric/agoric-sdk/commit/05c3060c6f589dc6d7ba209e27d3300e9ad4b05c))


### Bug Fixes

* document invariants ([9a7ac04](https://github.com/Agoric/agoric-sdk/commit/9a7ac04093a79df4092907c245c2242599c98bc7))
* recover stuck payments ([2e366cb](https://github.com/Agoric/agoric-sdk/commit/2e366cbbd447c0117f66bb740b05d2a1b4e82f33))
* remove purse.claim per review comment ([e68ce40](https://github.com/Agoric/agoric-sdk/commit/e68ce40cb019f82b21ec623761a1df3cd68c27f2))
* revert moveAssets changes ([58a61bb](https://github.com/Agoric/agoric-sdk/commit/58a61bb6f842357bd4cbc9628204fc8a1e8c7b53))
* review comments ([f35ec10](https://github.com/Agoric/agoric-sdk/commit/f35ec103e7a8efe16baa42ffad32055142fde1c1))
* typo ([#4871](https://github.com/Agoric/agoric-sdk/issues/4871)) ([3d36314](https://github.com/Agoric/agoric-sdk/commit/3d36314559b65a01287b89c74c4ad96dfd632027))
* virtualize payments, purses, ledger ([#4618](https://github.com/Agoric/agoric-sdk/issues/4618)) ([dfeda1b](https://github.com/Agoric/agoric-sdk/commit/dfeda1bd7d8ca954b139d8dedda0624b924b8d81))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.13.2...@agoric/ertp@0.13.3) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



### [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.13.1...@agoric/ertp@0.13.2) (2022-02-21)


### Features

* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))
* fullOrder leak. Semi-fungibles via CopyBags ([#4305](https://github.com/Agoric/agoric-sdk/issues/4305)) ([79c4276](https://github.com/Agoric/agoric-sdk/commit/79c4276da8c856674bd425c54715adec92648c48))
* ordered set operations ([#4196](https://github.com/Agoric/agoric-sdk/issues/4196)) ([bda9206](https://github.com/Agoric/agoric-sdk/commit/bda920694c7ab573822415653335e258b9c21281))
* remove pureCopy deleted from endo 1061 ([#4458](https://github.com/Agoric/agoric-sdk/issues/4458)) ([50e8523](https://github.com/Agoric/agoric-sdk/commit/50e852346d0b4005c613e30d10b469d89a4e5564))
* towards patterns and stores ([c241e39](https://github.com/Agoric/agoric-sdk/commit/c241e3978a36778197b1bf3874b07f1ed4df9ceb))



### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.13.0...@agoric/ertp@0.13.1) (2021-12-22)

**Note:** Version bump only for package @agoric/ertp





## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.12.2...@agoric/ertp@0.13.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.12.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.12.1...@agoric/ertp@0.12.2) (2021-10-13)

**Note:** Version bump only for package @agoric/ertp





### [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.12.0...@agoric/ertp@0.12.1) (2021-09-23)

**Note:** Version bump only for package @agoric/ertp





## [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.16...@agoric/ertp@0.12.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* improve error message when a purse is overdrawn (#3811)

### Bug Fixes

* improve error message when a purse is overdrawn ([#3811](https://github.com/Agoric/agoric-sdk/issues/3811)) ([7b5841c](https://github.com/Agoric/agoric-sdk/commit/7b5841caf6a3d99464c2156156e0f6337bb04690))
* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.11.16](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.15...@agoric/ertp@0.11.16) (2021-08-18)

**Note:** Version bump only for package @agoric/ertp





### [0.11.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.14...@agoric/ertp@0.11.15) (2021-08-17)


### Bug Fixes

* **ERTP:** log the payment object when it fails liveness ([ed7d5e1](https://github.com/Agoric/agoric-sdk/commit/ed7d5e114675a8e5604d7184f238696fb96cb834))



### [0.11.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.13...@agoric/ertp@0.11.14) (2021-08-16)

**Note:** Version bump only for package @agoric/ertp





### [0.11.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.10...@agoric/ertp@0.11.13) (2021-08-15)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **ERTP:** use metered=true and xs-worker on all swingset tests ([8c3da1f](https://github.com/Agoric/agoric-sdk/commit/8c3da1fa05c5734e1c839d480642f1716d003dd3))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.11.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.10...@agoric/ertp@0.11.12) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **ERTP:** use metered=true and xs-worker on all swingset tests ([8c3da1f](https://github.com/Agoric/agoric-sdk/commit/8c3da1fa05c5734e1c839d480642f1716d003dd3))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.11.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.10...@agoric/ertp@0.11.11) (2021-07-28)


### Bug Fixes

* **ERTP:** use metered=true and xs-worker on all swingset tests ([8c3da1f](https://github.com/Agoric/agoric-sdk/commit/8c3da1fa05c5734e1c839d480642f1716d003dd3))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.11.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.9...@agoric/ertp@0.11.10) (2021-07-01)

**Note:** Version bump only for package @agoric/ertp





### [0.11.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.8...@agoric/ertp@0.11.9) (2021-06-28)

**Note:** Version bump only for package @agoric/ertp





### [0.11.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.7...@agoric/ertp@0.11.8) (2021-06-25)

**Note:** Version bump only for package @agoric/ertp





### [0.11.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.6...@agoric/ertp@0.11.7) (2021-06-24)

**Note:** Version bump only for package @agoric/ertp





### [0.11.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.5...@agoric/ertp@0.11.6) (2021-06-24)

**Note:** Version bump only for package @agoric/ertp





### [0.11.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.4...@agoric/ertp@0.11.5) (2021-06-23)

**Note:** Version bump only for package @agoric/ertp





### [0.11.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.3...@agoric/ertp@0.11.4) (2021-06-16)

**Note:** Version bump only for package @agoric/ertp





### [0.11.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.2...@agoric/ertp@0.11.3) (2021-06-15)


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))



## [0.11.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.1...@agoric/ertp@0.11.2) (2021-05-10)

**Note:** Version bump only for package @agoric/ertp





## [0.11.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.11.0...@agoric/ertp@0.11.1) (2021-05-05)

**Note:** Version bump only for package @agoric/ertp





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.8...@agoric/ertp@0.11.0) (2021-05-05)


### Bug Fixes

* **ERTP:** now that {} is data, always return a displayInfo object ([fcc0cc4](https://github.com/Agoric/agoric-sdk/commit/fcc0cc4e61daef103556589fe7003da99d3c4626))
* settle REMOTE_STYLE name ([#2900](https://github.com/Agoric/agoric-sdk/issues/2900)) ([3dc6638](https://github.com/Agoric/agoric-sdk/commit/3dc66385b85cb3e8a1056b8d6e64cd3e448c041f))
* **ERTP:** avoid jessie warning ([fa68a8a](https://github.com/Agoric/agoric-sdk/commit/fa68a8af6864d04a73fbc9dc70f63fb3d4225c1a)), closes [#2704](https://github.com/Agoric/agoric-sdk/issues/2704)


### Features

* upgrade use-jessie eslint, and honour '// [@jessie-check](https://github.com/jessie-check)' ([fd1c24a](https://github.com/Agoric/agoric-sdk/commit/fd1c24a84584f6b5f7b7d5e8b21d756464db05b6))





## [0.10.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.7...@agoric/ertp@0.10.8) (2021-04-22)


### Bug Fixes

* **ERTP:** avoid jessie warning ([fe9319b](https://github.com/Agoric/agoric-sdk/commit/fe9319b40fe0c1e440db62f4200ffd2598a419d6)), closes [#2704](https://github.com/Agoric/agoric-sdk/issues/2704)





## [0.10.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.6...@agoric/ertp@0.10.7) (2021-04-18)

**Note:** Version bump only for package @agoric/ertp





## [0.10.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.5...@agoric/ertp@0.10.6) (2021-04-16)

**Note:** Version bump only for package @agoric/ertp





## [0.10.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.4...@agoric/ertp@0.10.5) (2021-04-14)

**Note:** Version bump only for package @agoric/ertp





## [0.10.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.3...@agoric/ertp@0.10.4) (2021-04-13)

**Note:** Version bump only for package @agoric/ertp





## [0.10.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.2...@agoric/ertp@0.10.3) (2021-04-07)

**Note:** Version bump only for package @agoric/ertp





## [0.10.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.1...@agoric/ertp@0.10.2) (2021-04-06)


### Bug Fixes

* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric-sdk/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric-sdk/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric-sdk/issues/2709)) ([85b674e](https://github.com/Agoric/agoric-sdk/commit/85b674e7942443219fa9828841cc7bd8ef909b47))
* use SWINGSET_WORKER_TYPE to avoid WORKER_TYPE ambiguity ([c4616f1](https://github.com/Agoric/agoric-sdk/commit/c4616f1db0f2668eef5dbb97e30800d4e9caf3a0))





## [0.10.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.10.0...@agoric/ertp@0.10.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.9.2...@agoric/ertp@0.10.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)


### Features

* **ava-xs:** handle some zoe tests ([#2573](https://github.com/Agoric/agoric-sdk/issues/2573)) ([7789834](https://github.com/Agoric/agoric-sdk/commit/7789834f7d232e395a707c5117295b768ed3fcff)), closes [#2503](https://github.com/Agoric/agoric-sdk/issues/2503)
* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric-sdk/issues/2561)) ([1620307](https://github.com/Agoric/agoric-sdk/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))





## [0.9.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.9.1...@agoric/ertp@0.9.2) (2021-02-22)

**Note:** Version bump only for package @agoric/ertp





## [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.9.0...@agoric/ertp@0.9.1) (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.8.0...@agoric/ertp@0.9.0) (2020-12-10)


### Features

* **ertp:** add purse.getCurrentAmountNotifier ([a060b5f](https://github.com/Agoric/agoric-sdk/commit/a060b5f5e760ea010aac68a300f9fadd12e1393b))
* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.3-dev.0...@agoric/ertp@0.8.0) (2020-11-07)


### Bug Fixes

* lexical balance simplifies issuer code ([#1889](https://github.com/Agoric/agoric-sdk/issues/1889)) ([224b39a](https://github.com/Agoric/agoric-sdk/commit/224b39add05ae3c10c1b1dc18b4ec71f9117e8ea))
* somewhat tighter test for plain empty object ([#1981](https://github.com/Agoric/agoric-sdk/issues/1981)) ([eff15a4](https://github.com/Agoric/agoric-sdk/commit/eff15a4056d27623c1e9bce0f53dc4022bf78345))


### Features

* add a decimals parameter, and decimals method to brand ([241d0aa](https://github.com/Agoric/agoric-sdk/commit/241d0aa6fa20bd2618f362e6f1781f5c92a844b5))
* convert the fakePriceAuthority to a PlayerPiano model ([#1985](https://github.com/Agoric/agoric-sdk/issues/1985)) ([cd7ebd8](https://github.com/Agoric/agoric-sdk/commit/cd7ebd86b1f37655b9213786ab6828dd6c7c098a))





## [0.7.3-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2...@agoric/ertp@0.7.3-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/ertp





## [0.7.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2-dev.2...@agoric/ertp@0.7.2) (2020-10-11)


### Bug Fixes

* **ERTP:** use makeExternalStore for ledgers ([20667ce](https://github.com/Agoric/agoric-sdk/commit/20667ce71ae07ddb6ff5d8c52a255e95b65ae70c))





## [0.7.2-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2-dev.1...@agoric/ertp@0.7.2-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.2-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.2-dev.0...@agoric/ertp@0.7.2-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.2-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.1...@agoric/ertp@0.7.2-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/ertp





## [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.7.0...@agoric/ertp@0.7.1) (2020-09-16)


### Bug Fixes

* declare amountMathKind parameter to makeissuerkit optional ([a21832a](https://github.com/Agoric/agoric-sdk/commit/a21832a9a2b88aa43d2b532a5b92f99c47d3e11b)), closes [#1373](https://github.com/Agoric/agoric-sdk/issues/1373)





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.6.0...@agoric/ertp@0.7.0) (2020-08-31)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* clean up E.when and E.resolve ([#1561](https://github.com/Agoric/agoric-sdk/issues/1561)) ([634046c](https://github.com/Agoric/agoric-sdk/commit/634046c0fc541fc1db258105a75c7313b5668aa0))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* send and receive Remotable tags ([#1628](https://github.com/Agoric/agoric-sdk/issues/1628)) ([1bae122](https://github.com/Agoric/agoric-sdk/commit/1bae1220c2c35f48f279cb3aeab6012bce8ddb5a))
* **zoe:** unify InstanceRecord usage (.instanceHandle -> .handle) ([9af7903](https://github.com/Agoric/agoric-sdk/commit/9af790322fc84a3aa1e41e957614fea2873c63b1))
* update JS typings ([20941e6](https://github.com/Agoric/agoric-sdk/commit/20941e675302ee5905e4825638e661065ad5d3f9))


### Features

* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.5...@agoric/ertp@0.6.0) (2020-06-30)


### Bug Fixes

* **ERTP:** use install-ses for tests ([41478e5](https://github.com/Agoric/agoric-sdk/commit/41478e53c35a087a69b4c1a741007c3170a7b6ce))
* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))





## [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.4...@agoric/ertp@0.5.5) (2020-05-17)

**Note:** Version bump only for package @agoric/ertp





## [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.3...@agoric/ertp@0.5.4) (2020-05-10)

**Note:** Version bump only for package @agoric/ertp





## [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.2...@agoric/ertp@0.5.3) (2020-05-04)


### Bug Fixes

* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))
* **zoe:** Invitation to offer refactored to use upcall ([#853](https://github.com/Agoric/agoric-sdk/issues/853)) ([c142b7a](https://github.com/Agoric/agoric-sdk/commit/c142b7a64e77262927da22bde3af5793a9d39c2a))





## [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.2-alpha.0...@agoric/ertp@0.5.2) (2020-04-13)

**Note:** Version bump only for package @agoric/ertp





## [0.5.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.1...@agoric/ertp@0.5.2-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/ertp





## [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.1-alpha.0...@agoric/ertp@0.5.1) (2020-04-02)

**Note:** Version bump only for package @agoric/ertp





## [0.5.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/ertp@0.5.0...@agoric/ertp@0.5.1-alpha.0) (2020-04-02)


### Tests

* convert some tests from try/catch/finally to t.plan() ([df8e686](https://github.com/Agoric/agoric-sdk/commit/df8e686bb2ea3a95e67cff930b9bfe46850f017d))





# 0.5.0 (2020-03-26)


### Bug Fixes

* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/ertp/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))


### Features

* make ERTP methods acccept promises or payments ([4b7f060](https://github.com/Agoric/ertp/commit/4b7f06048bb0f86c2028a9c9cfae8ff90b595bd7))
