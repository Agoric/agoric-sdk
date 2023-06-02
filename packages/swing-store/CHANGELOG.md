# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.9.0...@agoric/swing-store@0.9.1) (2023-06-02)

**Note:** Version bump only for package @agoric/swing-store





## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.8.1...@agoric/swing-store@0.9.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* **xsnap:** start xsnap takes snapshot stream
* **xsnap:** makeSnapshot yields snapshot data

### Features

* **swing-store:** enforce snapStore consistency ([b1343b7](https://github.com/Agoric/agoric-sdk/commit/b1343b72d743b707080e5da672fe1a43128e5d9e))
* **SwingSet:** force reload from snapshot ([86de218](https://github.com/Agoric/agoric-sdk/commit/86de2188ce73ed9c3f5d48f7826b77106c1af864))
* **swingset-tools:** add tool to extract bundles ([0144ec1](https://github.com/Agoric/agoric-sdk/commit/0144ec1efcdc41fa612b90883e634fb647d3d800))
* **swingstore:** add support for b0- bundles ([4a3b320](https://github.com/Agoric/agoric-sdk/commit/4a3b32045a332f8a3ed1fe5e3ad74e8719c870e4)), closes [#7190](https://github.com/Agoric/agoric-sdk/issues/7190)
* **xsnap:** makeSnapshot yields snapshot data ([348bbd2](https://github.com/Agoric/agoric-sdk/commit/348bbd2d9c251e7ec0f0aa109034d4bdb5ce89e4))
* **xsnap:** start xsnap takes snapshot stream ([ed87de1](https://github.com/Agoric/agoric-sdk/commit/ed87de12e46095aa18f56b7d0118c6c76d5bef64))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* convert swing-store from LMDB to Sqlite ([579a6c7](https://github.com/Agoric/agoric-sdk/commit/579a6c796a47092c4ee880316c7530d07d92c961))
* eliminate ephemeralSwingStore in favor of Sqlite :memory: database ([0283233](https://github.com/Agoric/agoric-sdk/commit/0283233d5dff11bd343ecb436176973376e88142))
* implement bundleStore ([34db767](https://github.com/Agoric/agoric-sdk/commit/34db7671daee5196c85f78ac82b90884e52fa555)), closes [#7089](https://github.com/Agoric/agoric-sdk/issues/7089)
* implement swingStore data export/import in support of state sync ([268e62f](https://github.com/Agoric/agoric-sdk/commit/268e62f8d68063de6416042ac1a8b94df89f3399)), closes [#6773](https://github.com/Agoric/agoric-sdk/issues/6773)
* Integrate kernel with bundleStore ([338556a](https://github.com/Agoric/agoric-sdk/commit/338556a7712ce676e15a97fc923439ca9c5c931a)), closes [#7197](https://github.com/Agoric/agoric-sdk/issues/7197)
* move snapstore into SQLite database with the rest of the swingstore ([5578834](https://github.com/Agoric/agoric-sdk/commit/55788342bbffe253dd12e919e005e3d093fd6b65)), closes [#6742](https://github.com/Agoric/agoric-sdk/issues/6742)
* refactor SwingStore APIs to cleanly distinguish kernel facet from host facet ([7126822](https://github.com/Agoric/agoric-sdk/commit/71268220d659469cd583c9c510ed8c1a1661f282))
* relocate snapshot metadata from kvStore to snapStore ([4e0f679](https://github.com/Agoric/agoric-sdk/commit/4e0f679b5f8249e1e9098731a96cc0fd793d5d9d)), closes [#6742](https://github.com/Agoric/agoric-sdk/issues/6742)
* use Sqlite save points for crank commit, integrate activity hash into swing-store ([6613d7e](https://github.com/Agoric/agoric-sdk/commit/6613d7eed8b2ee6f6fc06e1dc06747f80b0f44bd))


### Bug Fixes

* **swing-store:** add isCurrent SQLite CHECK ([90bd76c](https://github.com/Agoric/agoric-sdk/commit/90bd76c774810393fc8a1269976fd4d65b7d52ba))
* **swing-store:** noteExport span init ([5ba0d31](https://github.com/Agoric/agoric-sdk/commit/5ba0d31e03a35e8ffec5d3cb198347571505046e))
* **swing-store:** remove explicit wal_checkpoint ([efe6b7e](https://github.com/Agoric/agoric-sdk/commit/efe6b7e17b2a528b39ef30122a6cebb6a692fb96)), closes [#7069](https://github.com/Agoric/agoric-sdk/issues/7069)
* **swing-store:** replace getAllState/etc with a debug facet ([886528c](https://github.com/Agoric/agoric-sdk/commit/886528c3044488da57a80bc47290b031fa0713ce))
* **swing-store:** replace kvStore.getKeys() with getNextKey() ([4b2c29b](https://github.com/Agoric/agoric-sdk/commit/4b2c29b6881f1d0e9fb34ed8ba37ac4785468da8)), closes [#6468](https://github.com/Agoric/agoric-sdk/issues/6468)
* **swing-store:** switch to internal line transform ([f4b964a](https://github.com/Agoric/agoric-sdk/commit/f4b964a5c02568cc8ac0ac0e8642eacb8ca17b72))
* **swingset-tools:** extract vat transcript ([edbac04](https://github.com/Agoric/agoric-sdk/commit/edbac04166d0a8085c00d3d4194608377da9adc7))
* CI failures in other packages ([071bf89](https://github.com/Agoric/agoric-sdk/commit/071bf89a337f39b3cb73ef60649fbe47825806bc))
* eliminate snapStore `root` parameter ([f06a171](https://github.com/Agoric/agoric-sdk/commit/f06a17117ef391d46604a4bc34b185135396a7c5))
* incorporate review feedback ([24896ee](https://github.com/Agoric/agoric-sdk/commit/24896ee9271131d68cd2815028f272fefd1818cd))



### [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.8.0...@agoric/swing-store@0.8.1) (2022-10-05)

**Note:** Version bump only for package @agoric/swing-store





## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.7.0...@agoric/swing-store@0.8.0) (2022-09-20)


### Features

* **swing-store:** Update snapshot telemetry to differentiate new-file vs. existing-file ([73550f3](https://github.com/Agoric/agoric-sdk/commit/73550f3b8d052fcbf79c4cb9725153e31d270726))
* add env to keep old snapshots on disk ([96e1077](https://github.com/Agoric/agoric-sdk/commit/96e1077683c64ff0c66fdfaa3993043006c8f368))
* Report size and timing data of SnapStore save operations ([f0a6026](https://github.com/Agoric/agoric-sdk/commit/f0a602667b0a5599368170fadc4f95678bfcf711))
* Write makeSnapshot telemetry to slog ([4cdd2f8](https://github.com/Agoric/agoric-sdk/commit/4cdd2f8a07764046c9310218d45ffa16c4aa9e6b)), closes [#6164](https://github.com/Agoric/agoric-sdk/issues/6164)
* **swing-store:** Switch to lmdb-js ([89adc87](https://github.com/Agoric/agoric-sdk/commit/89adc87848494e78213d68194357c876b9ae4cf0))
* **swingstore:** switch to async fs for snapstore ([13d443c](https://github.com/Agoric/agoric-sdk/commit/13d443c0c9df84e2e7a150af034a01b7670e36c8))


### Bug Fixes

* **swing-store:** Depend on better-sqlite3 types ([ef8a90f](https://github.com/Agoric/agoric-sdk/commit/ef8a90fb0f3de58d7655451e3125d70460b559ad))
* **swing-store:** Infer directory to guarantee file rename atomicity ([40bc322](https://github.com/Agoric/agoric-sdk/commit/40bc322878f03b21e12455d6e5fe7d31fdaa3233))
* **swing-store:** Narrow JSDoc templating ([4ee3e32](https://github.com/Agoric/agoric-sdk/commit/4ee3e3210ce1c14f8f015f70311734a229081e90))
* **swing-store:** Narrow the signature of measureSeconds to require an async argument ([eaf0a68](https://github.com/Agoric/agoric-sdk/commit/eaf0a68a83fdde0e612bd1d74ea8c8a878abb2a8))
* record XS snapshots and file sizes to slog and console ([5116ebb](https://github.com/Agoric/agoric-sdk/commit/5116ebb4bae4acfc62475bfee1f4277fc2135d6f)), closes [#5419](https://github.com/Agoric/agoric-sdk/issues/5419)
* Report new metrics in seconds, and do so accurately ([c22309f](https://github.com/Agoric/agoric-sdk/commit/c22309f27aa6d0c327907c08588436972fe0c164))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **swing-store:** disable useWritemap ([691a4bd](https://github.com/Agoric/agoric-sdk/commit/691a4bd867020218258aae766402de646e82669c))
* **swing-store:** fix tests to use proper temp dbs ([e899f5c](https://github.com/Agoric/agoric-sdk/commit/e899f5c831d1177a3c26534d9c340e10f2b77073))
* **swing-store:** IterableIterator types ([48836dd](https://github.com/Agoric/agoric-sdk/commit/48836dded1385f94a694b2999dfd263eacb24070))
* **swing-store:** use sqlite transactions for streamStore operations ([33ebe2c](https://github.com/Agoric/agoric-sdk/commit/33ebe2cd2088520e06f68a1320b2e4a2a4f51ba9)), closes [#6056](https://github.com/Agoric/agoric-sdk/issues/6056)
* **swingset:** don't delete heap snapshot if it didn't change ([2cbe3a8](https://github.com/Agoric/agoric-sdk/commit/2cbe3a86d0936d60cd07f6d9eee7efd354986cb4)), closes [#5901](https://github.com/Agoric/agoric-sdk/issues/5901)
* **swingstore:** avoid conditional await on commit ([67d846d](https://github.com/Agoric/agoric-sdk/commit/67d846d244bf8cea5536611a54a5b9cccdaf2e84))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))


### Performance Improvements

* **swing-store:** Improve the efficiency of writing snapshots ([ef78e7d](https://github.com/Agoric/agoric-sdk/commit/ef78e7dfb3edc7c74f4fa86804c9204e977d5680)), closes [#6225](https://github.com/Agoric/agoric-sdk/issues/6225)



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.6...@agoric/swing-store@0.7.0) (2022-05-28)


### Features

* Accept path for swingStore trace ([63a209c](https://github.com/Agoric/agoric-sdk/commit/63a209c8c7906f8be07f87aedf1313e607df7b42))
* **swingset:** Add swing store trace option ([25c7e79](https://github.com/Agoric/agoric-sdk/commit/25c7e79d699e8894a283518490add19f60840f4b))


### Bug Fixes

* **swing-store:** check fs streams are ready ([deaaa13](https://github.com/Agoric/agoric-sdk/commit/deaaa133efb430db83c88631f1b5a95ff7e36a3a))
* **swingset:** fsync snapshots  ([#5451](https://github.com/Agoric/agoric-sdk/issues/5451)) ([396e4c6](https://github.com/Agoric/agoric-sdk/commit/396e4c62391f39267fd093afb0e37fcacbe79fe8))



### [0.6.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.5...@agoric/swing-store@0.6.6) (2022-04-18)

**Note:** Version bump only for package @agoric/swing-store





### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.4...@agoric/swing-store@0.6.5) (2022-02-24)

**Note:** Version bump only for package @agoric/swing-store





### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.3...@agoric/swing-store@0.6.4) (2022-02-21)


### Features

* **swing-store:** enable `LMDB_MAP_SIZE` and `SOLO_LMDB_MAP_SIZE` ([77f67a8](https://github.com/Agoric/agoric-sdk/commit/77f67a8010d84b4f595e1fbd524b344050ae47d6))



### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.2...@agoric/swing-store@0.6.3) (2021-12-02)

**Note:** Version bump only for package @agoric/swing-store





### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.1...@agoric/swing-store@0.6.2) (2021-10-13)

**Note:** Version bump only for package @agoric/swing-store





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store@0.6.0...@agoric/swing-store@0.6.1) (2021-09-23)

**Note:** Version bump only for package @agoric/swing-store





## 0.6.0 (2021-09-15)


### ⚠ BREAKING CHANGES

* clean up organization of swing-store

### Bug Fixes

* **swing-store:** be resilient to Node.js 16.x fs.rmSync ([990f909](https://github.com/Agoric/agoric-sdk/commit/990f909bfb90a1ef34ebba4677d88c9eb5106294))


### Code Refactoring

* clean up organization of swing-store ([3c7e57b](https://github.com/Agoric/agoric-sdk/commit/3c7e57b8f62c0b93660dd57c002ffb96c2cd4137))



### [0.5.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.10...@agoric/swing-store-lmdb@0.5.11) (2021-08-18)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.9...@agoric/swing-store-lmdb@0.5.10) (2021-08-17)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.6...@agoric/swing-store-lmdb@0.5.9) (2021-08-15)


### Bug Fixes

* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)

### 0.26.10 (2021-07-28)



### [0.5.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.6...@agoric/swing-store-lmdb@0.5.8) (2021-08-14)


### Bug Fixes

* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)

### 0.26.10 (2021-07-28)



### [0.5.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.6...@agoric/swing-store-lmdb@0.5.7) (2021-07-28)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.5...@agoric/swing-store-lmdb@0.5.6) (2021-07-01)


### Bug Fixes

* repair stream store self-interference problem ([948d837](https://github.com/Agoric/agoric-sdk/commit/948d837c5eb25e0085480804d9d2d4bab0729818)), closes [#3437](https://github.com/Agoric/agoric-sdk/issues/3437)



### [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.4...@agoric/swing-store-lmdb@0.5.5) (2021-06-28)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.3...@agoric/swing-store-lmdb@0.5.4) (2021-06-25)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.2...@agoric/swing-store-lmdb@0.5.3) (2021-06-24)


### Features

* sqlite-based transcript store ([#3402](https://github.com/Agoric/agoric-sdk/issues/3402)) ([960b013](https://github.com/Agoric/agoric-sdk/commit/960b0139ff415a4d3ac0784c2a68e3c513a8efe4)), closes [#3405](https://github.com/Agoric/agoric-sdk/issues/3405)



### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.1...@agoric/swing-store-lmdb@0.5.2) (2021-06-23)

**Note:** Version bump only for package @agoric/swing-store-lmdb





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.5.0...@agoric/swing-store-lmdb@0.5.1) (2021-06-16)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.12...@agoric/swing-store-lmdb@0.5.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **swing-store-lmdb:** This includes a renaming of the constructors to acknowledge
that the different SwingStore constructors are not polymorphic.

### Features

* **swing-store-lmdb:** enable configuration of LMDB database size limit ([6f7cefa](https://github.com/Agoric/agoric-sdk/commit/6f7cefa6eae92ff00594a576a7ccad4c5c5c2bcc))
* greater paranoia about concurrent access ([e67c4ef](https://github.com/Agoric/agoric-sdk/commit/e67c4ef37d2a0d9361612401b43c2b81a4ebc66d))
* move transcripts out of key-value store and into stream stores ([a128e93](https://github.com/Agoric/agoric-sdk/commit/a128e93803344d8a36140d53d3e7711bec5c2511))
* overhaul stream store API to better fit actual use in kernel ([c5cc00a](https://github.com/Agoric/agoric-sdk/commit/c5cc00a9e0f1c90ee2cb57fe6c3767a285f4d8e3))
* provide streamStore implementations ([e094914](https://github.com/Agoric/agoric-sdk/commit/e094914ad5ceec3d1131270e5943c6f0df267cac))
* remove .jsonlines hack from simple swing store ([ef87997](https://github.com/Agoric/agoric-sdk/commit/ef87997a1519b18f23656b57bf38055fea203f9a))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* tweaks and cleanup based on review feedback ([ba95e34](https://github.com/Agoric/agoric-sdk/commit/ba95e34622063eaae47335a0260a004a3a159807))



## [0.4.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.11...@agoric/swing-store-lmdb@0.4.12) (2021-05-10)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.10...@agoric/swing-store-lmdb@0.4.11) (2021-05-05)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.9...@agoric/swing-store-lmdb@0.4.10) (2021-05-05)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.8...@agoric/swing-store-lmdb@0.4.9) (2021-04-22)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.7...@agoric/swing-store-lmdb@0.4.8) (2021-04-18)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.6...@agoric/swing-store-lmdb@0.4.7) (2021-04-16)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.5...@agoric/swing-store-lmdb@0.4.6) (2021-04-07)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.4...@agoric/swing-store-lmdb@0.4.5) (2021-04-06)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.3...@agoric/swing-store-lmdb@0.4.4) (2021-03-24)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.2...@agoric/swing-store-lmdb@0.4.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.1...@agoric/swing-store-lmdb@0.4.2) (2021-02-22)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.4.0...@agoric/swing-store-lmdb@0.4.1) (2021-02-16)


### Bug Fixes

* review comments ([17d7df6](https://github.com/Agoric/agoric-sdk/commit/17d7df6ee06eb5c340500bb5582f985c2993ab19))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.7...@agoric/swing-store-lmdb@0.4.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





## [0.3.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.7-dev.0...@agoric/swing-store-lmdb@0.3.7) (2020-11-07)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.7-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.6...@agoric/swing-store-lmdb@0.3.7-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.6-dev.2...@agoric/swing-store-lmdb@0.3.6) (2020-10-11)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.6-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.6-dev.1...@agoric/swing-store-lmdb@0.3.6-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.6-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.6-dev.0...@agoric/swing-store-lmdb@0.3.6-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.6-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.5...@agoric/swing-store-lmdb@0.3.6-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.4...@agoric/swing-store-lmdb@0.3.5) (2020-09-16)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.3...@agoric/swing-store-lmdb@0.3.4) (2020-08-31)


### Bug Fixes

* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.2...@agoric/swing-store-lmdb@0.3.3) (2020-06-30)


### Performance Improvements

* Don't use the useWritemap option if we know we don't need it ([c272e43](https://github.com/Agoric/agoric-sdk/commit/c272e43f270cb9df47619cc95fed938520aec344))





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.1...@agoric/swing-store-lmdb@0.3.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.3.0...@agoric/swing-store-lmdb@0.3.1) (2020-05-10)

**Note:** Version bump only for package @agoric/swing-store-lmdb





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.2.2...@agoric/swing-store-lmdb@0.3.0) (2020-05-04)


### Bug Fixes

* stop LMDB from crashing in the WLS environment ([89fb788](https://github.com/Agoric/agoric-sdk/commit/89fb788b12466cfa4da887c3aa8fc159a13f62dc))


### Features

* swing-store-lmdb: add isSwingStore() query ([fce7168](https://github.com/Agoric/agoric-sdk/commit/fce7168d3830e528f6a3464ebaa708cf129a114a)), closes [#953](https://github.com/Agoric/agoric-sdk/issues/953)





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.2.2-alpha.0...@agoric/swing-store-lmdb@0.2.2) (2020-04-13)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.2.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.2.1...@agoric/swing-store-lmdb@0.2.2-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.2.1-alpha.0...@agoric/swing-store-lmdb@0.2.1) (2020-04-02)

**Note:** Version bump only for package @agoric/swing-store-lmdb





## [0.2.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-lmdb@0.2.0...@agoric/swing-store-lmdb@0.2.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swing-store-lmdb





# 0.2.0 (2020-03-26)


### Features

* Log (and graph) database disk usage ([9f9f5af](https://github.com/Agoric/agoric-sdk/commit/9f9f5af964d6661bb1d6bd1f2ea91098bcad62b0))
