# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.10.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.10.2...@agoric/deploy-script-support@0.10.3) (2023-06-09)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.10.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.10.1...@agoric/deploy-script-support@0.10.2) (2023-06-02)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.10.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.10.0...@agoric/deploy-script-support@0.10.1) (2023-05-24)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.4...@agoric/deploy-script-support@0.10.0) (2023-05-19)


### Features

* **core-proposals:** use bundle hash for label ([2eec093](https://github.com/Agoric/agoric-sdk/commit/2eec0939bd87bfcc48634ab75e2ba830cdb321e3))
* **deploy-script-support:** Publish bundles to chain if possible ([e8209da](https://github.com/Agoric/agoric-sdk/commit/e8209daec69fc6fd60f5d865cf29271eb106a995))
* **deploy-script-support:** reenable for `agoric run init-core.js` without `ag-solo` ([2b2bc96](https://github.com/Agoric/agoric-sdk/commit/2b2bc96780b00d9c964dba6e6c5de36acd4a83c6))


### Bug Fixes

* **deploy-script-support:** avoid pulling in notifiers ([#7522](https://github.com/Agoric/agoric-sdk/issues/7522)) ([c73675d](https://github.com/Agoric/agoric-sdk/commit/c73675dad025b6600f0eafe9f8e768086e50b626))
* **deploy-script-support:** update permits for `vatAdminSvc` ([73fef25](https://github.com/Agoric/agoric-sdk/commit/73fef256ab9abda1bda7e0619e8eee08c19f8883))
* avoid using top-level `require` ([57ca2db](https://github.com/Agoric/agoric-sdk/commit/57ca2dbfbadb373f97d43b2fb4e90302c9149976))
* change manifestInstallRef to manifestBundleRef ([4b87694](https://github.com/Agoric/agoric-sdk/commit/4b8769494eec1ce6bb5beda295389e8b982a9f37))
* remove unused overridded restoreRef, fix default version ([7f1cd48](https://github.com/Agoric/agoric-sdk/commit/7f1cd488e2aa7f89473b2187016f7f0dcbc989e8))
* rename makeEnactCoreProposalsFromBundleName to ..BundleRef ([7403f06](https://github.com/Agoric/agoric-sdk/commit/7403f06f58f0f50ecd154ad076a0a82317f3018b))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))
* replace zoe.install with zoe.installBundleID ([8a91b1b](https://github.com/Agoric/agoric-sdk/commit/8a91b1b06bf1a62c08156e595cf46f5194f73337)), closes [#6826](https://github.com/Agoric/agoric-sdk/issues/6826)
* **deploy-script-support:** Use versioned bundleSource ([41af48e](https://github.com/Agoric/agoric-sdk/commit/41af48e0d44e0615a53d5e3fe9f019895a58f96d))



### [0.9.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.5...@agoric/deploy-script-support@0.9.6) (2023-02-17)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.9.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.4...@agoric/deploy-script-support@0.9.5) (2022-12-14)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.9.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.3...@agoric/deploy-script-support@0.9.4) (2022-10-18)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.9.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.2...@agoric/deploy-script-support@0.9.3) (2022-10-08)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.9.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.1...@agoric/deploy-script-support@0.9.2) (2022-10-05)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.9.0...@agoric/deploy-script-support@0.9.1) (2022-09-20)


### Bug Fixes

* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **deploy-script-helpers:** Update core proposal behavior test ([abeb52e](https://github.com/Agoric/agoric-sdk/commit/abeb52e6bd121d508b72662135926a1b405fc9c3))



## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.8.0...@agoric/deploy-script-support@0.9.0) (2022-05-28)


### ⚠ BREAKING CHANGES

* **extract-proposal:** insist on an explicit `entrypoint`

### Features

* **core-proposal:** provide an `overrideManifest` to make the manifest explicit ([6557ecf](https://github.com/Agoric/agoric-sdk/commit/6557ecfb965fd668cf9538132e63a0419b86bd54))
* **extract-proposal:** allow specifying module, entrypoint, args ([af712eb](https://github.com/Agoric/agoric-sdk/commit/af712eb979483e14bae765a018911b018d76b973))


### Bug Fixes

* **extract-proposal:** insist on an explicit `entrypoint` ([02df38b](https://github.com/Agoric/agoric-sdk/commit/02df38b8a5ef96a78fd6ff7f5c20ffcdba161038))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.7.0...@agoric/deploy-script-support@0.8.0) (2022-05-09)


### Features

* **deploy-script-support:** persist option for installInPieces ([8241a0e](https://github.com/Agoric/agoric-sdk/commit/8241a0e0977a1ef2bbfd7e68197cb969bc80e1f1))


### Bug Fixes

* **deploy-script-support:** permit agoricNamesAdmin for installation ([49b5e89](https://github.com/Agoric/agoric-sdk/commit/49b5e89e287b9f5e8ccc5cb7c26dea53c09c42de))
* **extract-proposal:** avoid reiterating bundleHandles ([9a0886d](https://github.com/Agoric/agoric-sdk/commit/9a0886d7d96699cf5698bbe81820626e3ee8c64b))
* **extract-proposal:** coreProposal source paths were leaked onto the chain ([acc6672](https://github.com/Agoric/agoric-sdk/commit/acc66729cfa8459ef549b96f6fbeed1d55a4be3f))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.6.3...@agoric/deploy-script-support@0.7.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* **build-bundles:** create source bundles with helper ([732292a](https://github.com/Agoric/agoric-sdk/commit/732292acf817ab774dea3d15209c0b5a2b2e326d))
* **deploy-script-support:** `getBundlerMaker` helper ([542786d](https://github.com/Agoric/agoric-sdk/commit/542786dfc7ef67ed718d8f1548d13dd45dbfc34f))
* **deploy-script-support:** `installInPieces` interim implementation ([3db8233](https://github.com/Agoric/agoric-sdk/commit/3db823391f39d23e4dc42d8ca256bf9fa28466e7))
* **deploy-script-support:** first cut at `writeCoreProposal` ([6129b38](https://github.com/Agoric/agoric-sdk/commit/6129b38201f80a4e195d4675981e693c06c8c547))
* **deploy-script-support:** more `createBundles` work ([009b49f](https://github.com/Agoric/agoric-sdk/commit/009b49fc133ca9f6740bdebaec9baf7c549aec1f))
* **deploy-script-support:** shell out to `bundle-source` ([18e8c88](https://github.com/Agoric/agoric-sdk/commit/18e8c88223da0f4ef6998e0bc0e39a7979dd317b))
* **deploy-script-suppport:** e2e `writeCoreProposal` ([88a0cf7](https://github.com/Agoric/agoric-sdk/commit/88a0cf70c9078f0e9e2c46a6cc30bcb736e6e379))
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)


### Bug Fixes

* **deploy-script-support:** `makeEnactCoreProposals` for bootstrap ([cbff644](https://github.com/Agoric/agoric-sdk/commit/cbff644eb379fd61f38a64cd09140439551a6e80))
* **writeCoreProposal:** linearize the `installInPieces` calls ([a92a22a](https://github.com/Agoric/agoric-sdk/commit/a92a22a124e5cf18b677b3067bc59aa508e9d5f1))
* **writeCoreProposal:** merge permits and less ambient authority ([f34f7b7](https://github.com/Agoric/agoric-sdk/commit/f34f7b72aa2827e0f12ba46a8500d3b259c910f9))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.6.2...@agoric/deploy-script-support@0.6.3) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.6.1...@agoric/deploy-script-support@0.6.2) (2022-02-21)


### Features

* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))



### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.6.0...@agoric/deploy-script-support@0.6.1) (2021-12-22)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.5...@agoric/deploy-script-support@0.6.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.4...@agoric/deploy-script-support@0.5.5) (2021-10-13)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.3...@agoric/deploy-script-support@0.5.4) (2021-09-23)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.2...@agoric/deploy-script-support@0.5.3) (2021-09-15)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.1...@agoric/deploy-script-support@0.5.2) (2021-08-21)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.5.0...@agoric/deploy-script-support@0.5.1) (2021-08-18)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.4.1...@agoric/deploy-script-support@0.5.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.4.0...@agoric/deploy-script-support@0.4.1) (2021-08-16)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.18...@agoric/deploy-script-support@0.4.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **deploy-script-support:** Convert RESM to NESM (breaking)

### Code Refactoring

* **deploy-script-support:** Convert RESM to NESM (breaking) ([0d59ac2](https://github.com/Agoric/agoric-sdk/commit/0d59ac2a1f748d8e3cc87b8cbb221b0188d729cc))

### 0.26.10 (2021-07-28)



## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.18...@agoric/deploy-script-support@0.3.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **deploy-script-support:** Convert RESM to NESM (breaking)

### Code Refactoring

* **deploy-script-support:** Convert RESM to NESM (breaking) ([0d59ac2](https://github.com/Agoric/agoric-sdk/commit/0d59ac2a1f748d8e3cc87b8cbb221b0188d729cc))

### 0.26.10 (2021-07-28)



### [0.2.19](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.18...@agoric/deploy-script-support@0.2.19) (2021-07-28)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.18](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.17...@agoric/deploy-script-support@0.2.18) (2021-07-01)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.17](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.16...@agoric/deploy-script-support@0.2.17) (2021-07-01)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.16](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.15...@agoric/deploy-script-support@0.2.16) (2021-06-28)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.14...@agoric/deploy-script-support@0.2.15) (2021-06-25)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.13...@agoric/deploy-script-support@0.2.14) (2021-06-24)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.12...@agoric/deploy-script-support@0.2.13) (2021-06-24)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.11...@agoric/deploy-script-support@0.2.12) (2021-06-23)


### Bug Fixes

* **deploy-script-support:** Relax constraint on repository clone path ([6ec7a4d](https://github.com/Agoric/agoric-sdk/commit/6ec7a4d440cb60a54dbcd86c5e359bac1689e672))



### [0.2.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.10...@agoric/deploy-script-support@0.2.11) (2021-06-16)

**Note:** Version bump only for package @agoric/deploy-script-support





### [0.2.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.9...@agoric/deploy-script-support@0.2.10) (2021-06-15)


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))



## [0.2.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.8...@agoric/deploy-script-support@0.2.9) (2021-05-10)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.7...@agoric/deploy-script-support@0.2.8) (2021-05-05)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.6...@agoric/deploy-script-support@0.2.7) (2021-05-05)


### Bug Fixes

* **deploy-script-support:** update to new vats package ([9de6ed1](https://github.com/Agoric/agoric-sdk/commit/9de6ed12dca1346912bb3255bbb48601ac09693e))
* settle REMOTE_STYLE name ([#2900](https://github.com/Agoric/agoric-sdk/issues/2900)) ([3dc6638](https://github.com/Agoric/agoric-sdk/commit/3dc66385b85cb3e8a1056b8d6e64cd3e448c041f))





## [0.2.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.5...@agoric/deploy-script-support@0.2.6) (2021-04-22)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.4...@agoric/deploy-script-support@0.2.5) (2021-04-18)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.3...@agoric/deploy-script-support@0.2.4) (2021-04-16)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.2...@agoric/deploy-script-support@0.2.3) (2021-04-14)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.1...@agoric/deploy-script-support@0.2.2) (2021-04-13)

**Note:** Version bump only for package @agoric/deploy-script-support





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.2.0...@agoric/deploy-script-support@0.2.1) (2021-04-07)

**Note:** Version bump only for package @agoric/deploy-script-support





# [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.1.1...@agoric/deploy-script-support@0.2.0) (2021-04-06)


### Bug Fixes

* Many more tests use ses-ava ([#2733](https://github.com/Agoric/agoric-sdk/issues/2733)) ([d1e0f0f](https://github.com/Agoric/agoric-sdk/commit/d1e0f0fef8251f014b96ca7f3975efd37e1925f8))
* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* use ses-ava in SwingSet where possible ([#2709](https://github.com/Agoric/agoric-sdk/issues/2709)) ([85b674e](https://github.com/Agoric/agoric-sdk/commit/85b674e7942443219fa9828841cc7bd8ef909b47))


### Features

* more logging for deploy helpers ([#2744](https://github.com/Agoric/agoric-sdk/issues/2744)) ([fe459fb](https://github.com/Agoric/agoric-sdk/commit/fe459fb6bd47638a2c3cb72c1150762fcce844c8))





## [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.1.0...@agoric/deploy-script-support@0.1.1) (2021-03-24)


### Bug Fixes

* deploy-script-support tests ([#2677](https://github.com/Agoric/agoric-sdk/issues/2677)) ([0d1b1de](https://github.com/Agoric/agoric-sdk/commit/0d1b1deaffba124457ab50377e781b2185cc3098))





# [0.1.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.0.3...@agoric/deploy-script-support@0.1.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)


### Features

* add static amountMath. Backwards compatible with old amountMath ([#2561](https://github.com/Agoric/agoric-sdk/issues/2561)) ([1620307](https://github.com/Agoric/agoric-sdk/commit/1620307ee1b45033032617cc14dfabfb338b0dc2))





## [0.0.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/deploy-script-support@0.0.2...@agoric/deploy-script-support@0.0.3) (2021-02-22)

**Note:** Version bump only for package @agoric/deploy-script-support





## 0.0.2 (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))





# Change Log
