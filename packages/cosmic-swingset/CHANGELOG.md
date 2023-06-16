# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.41.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.41.2...@agoric/cosmic-swingset@0.41.3) (2023-06-09)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.41.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.41.1...@agoric/cosmic-swingset@0.41.2) (2023-06-02)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.41.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.41.0...@agoric/cosmic-swingset@0.41.1) (2023-05-24)

**Note:** Version bump only for package @agoric/cosmic-swingset





## [0.41.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.39.2...@agoric/cosmic-swingset@0.41.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* test-vaults-config -> itest-vaults-config to avoid conflict
* move swingset state dir
* emit smallcaps-format data in all marshallers
* remove storeName parameter

### Features

* Add SwingSet configuration to purge vstorage within (re-)bootstrap ([f248e91](https://github.com/Agoric/agoric-sdk/commit/f248e9116512374fb95f789b26e27b66cd5c34ca)), closes [#7681](https://github.com/Agoric/agoric-sdk/issues/7681)
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* extend Prometheus kernel stats ([44a934f](https://github.com/Agoric/agoric-sdk/commit/44a934f0d0a5177000b5bf081ae27e35a05c9aef)), closes [#7092](https://github.com/Agoric/agoric-sdk/issues/7092) [#7092](https://github.com/Agoric/agoric-sdk/issues/7092)
* move swingset state dir ([eddb46b](https://github.com/Agoric/agoric-sdk/commit/eddb46bd0e41340aec7d420adc37074fbca1b177))
* **cosmic-swingset:** Add a config property for exporting storage to bootstrap ([c065f3b](https://github.com/Agoric/agoric-sdk/commit/c065f3b2be675513343a70853ea607750d13776b)), closes [#7156](https://github.com/Agoric/agoric-sdk/issues/7156)
* **cosmic-swingset:** add after-commit action ([970a53f](https://github.com/Agoric/agoric-sdk/commit/970a53f827ded21b27525f6b0042bbc124c62d48))
* **cosmic-swingset:** Add context info to actionQueue items ([ed47435](https://github.com/Agoric/agoric-sdk/commit/ed4743519e81dbb05b6136de1f94bae0ae0f87c8))
* **cosmic-swingset:** add kernel-db exporter ([df304d5](https://github.com/Agoric/agoric-sdk/commit/df304d585928bfe3e7b9bc12ed9b1668726f54ec))
* **cosmic-swingset:** basic snapshot wiring ([b1072d8](https://github.com/Agoric/agoric-sdk/commit/b1072d8b1ddabbb5f2835eb503c945fed3b6b080))
* **cosmic-swingset:** execute export in a subprocess ([05e2b15](https://github.com/Agoric/agoric-sdk/commit/05e2b15a3f5b749ae95d0e1f3eb96fc0ec0d7467))
* **cosmic-swingset:** leave inbound in actionQueue ([a32299d](https://github.com/Agoric/agoric-sdk/commit/a32299df308eb869def870cca93f0b89e37e9110))
* **cosmic-swingset:** process highPriorityQueue actions ([182a96e](https://github.com/Agoric/agoric-sdk/commit/182a96e169c8cac7f31fbce014783fd6db72b64c))
* tweak state-sync logging ([#7468](https://github.com/Agoric/agoric-sdk/issues/7468)) ([9ec9ce2](https://github.com/Agoric/agoric-sdk/commit/9ec9ce277897c47df8b64856eabd3119f89416ce))
* **cosmic-swingset:** add inboundNum to inbound slog events ([1f04418](https://github.com/Agoric/agoric-sdk/commit/1f044183fdc3430c26b5cf1c011445297a996393))
* **cosmic-swingset:** add kernel-db importer ([00fab12](https://github.com/Agoric/agoric-sdk/commit/00fab12e464e5604cb3e5eb697fd02565ea78fe7))
* **cosmic-swingset:** explicit verbose option for export db ([a2dabd1](https://github.com/Agoric/agoric-sdk/commit/a2dabd1672c580e1f421336f2ab34e2694ed5557))
* **cosmic-swingset:** export swingStore kvData to vstorage ([be68431](https://github.com/Agoric/agoric-sdk/commit/be684315dc68ecf0cb603a8eb38ddd5418e996a6))
* **cosmic-swingset:** launch-chain add shutdown ([01bd686](https://github.com/Agoric/agoric-sdk/commit/01bd686c4e7ba177e90135c283c1b89025534e7d))
* **cosmic-swingset:** leverage `agoric-sdk/bin/agd` for lazy builds ([c2dd1d6](https://github.com/Agoric/agoric-sdk/commit/c2dd1d6f941b9a03b82b9bdfbb12e1c6e72b0784))
* **cosmic-swingset:** More complete vstorage access ([2d886de](https://github.com/Agoric/agoric-sdk/commit/2d886dee4b6518f176fc844d560422fe0fb53ffd))
* **cosmic-swingset:** poll timer after swingset quiescent ([c6df9ad](https://github.com/Agoric/agoric-sdk/commit/c6df9ad0c504722dbb3e586d1819a1fdee613b48))
* **cosmic-swingset:** remove unnecessary explicit activityhash ([5dcc44d](https://github.com/Agoric/agoric-sdk/commit/5dcc44d31be0c8a95a5749d768791fa35b72dbd3))
* **cosmic-swingset:** update scenario2 to post-Pismo ([715a389](https://github.com/Agoric/agoric-sdk/commit/715a389597903211e5106f539ef4c490b8c9e08f))
* **cosmic-swingset:** wait for after commit stats ([5f29966](https://github.com/Agoric/agoric-sdk/commit/5f29966568bb7abb3147dc70a26b2121e7e4b753))
* **cosmic-swingset:** wire snapshot restoring in chain-main ([9d053b7](https://github.com/Agoric/agoric-sdk/commit/9d053b7381280c8d7afc35fb1bcbf6dd18886738))
* **cosmic-swingset:** wire snapshot taking in chain-main ([22bc1d5](https://github.com/Agoric/agoric-sdk/commit/22bc1d54a7582d9490959dfe204838293412b537))
* boot-oracles ([ce8f8de](https://github.com/Agoric/agoric-sdk/commit/ce8f8de65ad4c14b4e8d699cd721683cfa1cc495))
* convert swing-store from LMDB to Sqlite ([579a6c7](https://github.com/Agoric/agoric-sdk/commit/579a6c796a47092c4ee880316c7530d07d92c961))
* export buildSwingset ([28eae2b](https://github.com/Agoric/agoric-sdk/commit/28eae2b55632b50c2868615e22a80d7fcb8cb1c5))
* **telemetry:** SLOGSENDER_FAIL_ON_ERROR ([db79fca](https://github.com/Agoric/agoric-sdk/commit/db79fcad8bc784d300acfd994ceab9a2b9c2a567))
* refactor SwingStore APIs to cleanly distinguish kernel facet from host facet ([7126822](https://github.com/Agoric/agoric-sdk/commit/71268220d659469cd583c9c510ed8c1a1661f282))
* **economy-config:** allow override of PRIMARY_ADDRESS ([06119b8](https://github.com/Agoric/agoric-sdk/commit/06119b81005c61641781614fab2c206f13b43ff8))


### Bug Fixes

* clearStorageSubtrees should not exclude exportStorageSubtrees ([9c6ceb9](https://github.com/Agoric/agoric-sdk/commit/9c6ceb91d1a7334483f9d0143fab75e7c2d4ccb1))
* test-vaults-config -> itest-vaults-config to avoid conflict ([db8f915](https://github.com/Agoric/agoric-sdk/commit/db8f915f579293d373d9f395dae28da383fab8a3))
* **cosmic-swingset:** `setterMethod` for surgical storage event emission ([7b2938a](https://github.com/Agoric/agoric-sdk/commit/7b2938a5209172f1f15248449b306e097158c3e9))
* **cosmic-swingset:** avoid overriding Makefile vat config ([f0ce811](https://github.com/Agoric/agoric-sdk/commit/f0ce811ae20f43c7897b7b3554802a464f82032e))
* **cosmic-swingset:** correct typings for bufferedStorage ([c8f3623](https://github.com/Agoric/agoric-sdk/commit/c8f362326053fa9e3f38d300c336918f101a4db0))
* **cosmic-swingset:** early done check in makeQueue ([de1a353](https://github.com/Agoric/agoric-sdk/commit/de1a35310f0af4829f01356c5c0933fcc45baf78))
* **cosmic-swingset:** enforce no parallel consume for actionQueue ([0d99438](https://github.com/Agoric/agoric-sdk/commit/0d9943860668744548de1218d070093e436bed8a))
* **cosmic-swingset:** IbcATOM -> ATOM ([03e202c](https://github.com/Agoric/agoric-sdk/commit/03e202c4e2bdd97c4df80ea93e4c78209363a4ce))
* **cosmic-swingset:** move makeBufferedStorage() out of swingset ([c148774](https://github.com/Agoric/agoric-sdk/commit/c1487747a64c6a64ccefcc477a008bd929f766bc))
* **cosmic-swingset:** no actionQueue.consumeAll in hangover recovery ([#6921](https://github.com/Agoric/agoric-sdk/issues/6921)) ([d3c6e8a](https://github.com/Agoric/agoric-sdk/commit/d3c6e8aec6e8bd47b8dc249135dc68b949b8e321))
* **cosmic-swingset:** Provide blockTime to bootstrap ([#7125](https://github.com/Agoric/agoric-sdk/issues/7125)) ([748d52c](https://github.com/Agoric/agoric-sdk/commit/748d52cf888981c8c48c26a807fe5abf12ed4130))
* **cosmic-swingset:** Remove unused getKeys in bufferedStorage ([0d5aea7](https://github.com/Agoric/agoric-sdk/commit/0d5aea77e9ceb8649da298237035701d18f35bd0))
* **cosmic-swingset:** remove unused saved blockTime ([37858cb](https://github.com/Agoric/agoric-sdk/commit/37858cba6b6799782d544c2317a860bf355f741f))
* **cosmic-swingset:** shutdown controller cleanly only on interrupt ([f64340e](https://github.com/Agoric/agoric-sdk/commit/f64340e67d83cf9b26c1a33f2b782764244efcf3))
* **cosmic-swingset:** shutdown controller on exit ([c5410dd](https://github.com/Agoric/agoric-sdk/commit/c5410ddf8d4355433ec099317f91a19b61b954d7))
* **cosmic-swingset:** silence incorrect kernel-stats warnings ([431e347](https://github.com/Agoric/agoric-sdk/commit/431e34783dc71ec07bcff00af1092c90c73738e4))
* **cosmic-swingset:** type of makeInstallationPublisher ([804502e](https://github.com/Agoric/agoric-sdk/commit/804502e6049168fc237e5661d9e834710b158cb4))
* **cosmic-swingset:** use `@endo/init/unsafe-fast.js` for chain ([81e9412](https://github.com/Agoric/agoric-sdk/commit/81e94120bb897dafb0194a9e52b722acff6b1678))
* **cosmic-swingset:** Use BigInt for chainQueue bounds ([40a8abb](https://github.com/Agoric/agoric-sdk/commit/40a8abb5aeac9237613fd50e4bbacb33f8057ed9))
* **vats:** move vat-ibc/vat-network from config to network-proposal.js ([68c8363](https://github.com/Agoric/agoric-sdk/commit/68c8363dea5aa4f2f1846e053ccd68d4e6a9131c)), closes [#7044](https://github.com/Agoric/agoric-sdk/issues/7044)
* align testnet -> agoric start tooling ([ead89fb](https://github.com/Agoric/agoric-sdk/commit/ead89fb49b4095f326f4bbab52ac79c9dd7d0e2f))
* CI failures in other packages ([071bf89](https://github.com/Agoric/agoric-sdk/commit/071bf89a337f39b3cb73ef60649fbe47825806bc))
* cosmic_swingset_inbound_queue_length is a gauge ([c7f5144](https://github.com/Agoric/agoric-sdk/commit/c7f51441a49b70bd033a69ab7b10ee4ddc7bc1cb))
* rename docker image root ([#7186](https://github.com/Agoric/agoric-sdk/issues/7186)) ([ab2efa6](https://github.com/Agoric/agoric-sdk/commit/ab2efa64b44fb410592b6dfa2a992296fd8b51d4))
* **telemetry:** upgrade otel deps ([dc48759](https://github.com/Agoric/agoric-sdk/commit/dc4875992937f9648381efae70818fa767d4b901))
* replace unsafe then with E.when ([#6684](https://github.com/Agoric/agoric-sdk/issues/6684)) ([d7a749e](https://github.com/Agoric/agoric-sdk/commit/d7a749eec4ddec9ba39bbc65434f03ec113cae7c))


### Miscellaneous Chores

* remove storeName parameter ([452f9bc](https://github.com/Agoric/agoric-sdk/commit/452f9bc680d4f54bed5608eb0d7cf67d80d87ba0))



## [0.40.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.39.3...@agoric/cosmic-swingset@0.40.0) (2023-02-17)


### Features

* **cosmic-swingset:** validate smart wallet actions ([#7018](https://github.com/Agoric/agoric-sdk/issues/7018)) ([9578144](https://github.com/Agoric/agoric-sdk/commit/95781446b48b49ae339f15438b4ffb7033df46b6))


### Bug Fixes

* **cosmic-swingset:** no actionQueue.consumeAll in hangover recovery ([#6912](https://github.com/Agoric/agoric-sdk/issues/6912)) ([d5792f7](https://github.com/Agoric/agoric-sdk/commit/d5792f7b9b5884aa2f70d1f848781229edf03051))
* **telemetry:** upgrade otel deps ([2c9b017](https://github.com/Agoric/agoric-sdk/commit/2c9b017d301048e5782b3b8cf684392e00419221))



### [0.39.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.39.2...@agoric/cosmic-swingset@0.39.3) (2022-12-14)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.39.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.39.1...@agoric/cosmic-swingset@0.39.2) (2022-10-18)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.39.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.39.0...@agoric/cosmic-swingset@0.39.1) (2022-10-08)

**Note:** Version bump only for package @agoric/cosmic-swingset





## [0.39.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.38.0...@agoric/cosmic-swingset@0.39.0) (2022-10-05)


### Features

* compute separate mempool limit for allowed inbound ([ebfc852](https://github.com/Agoric/agoric-sdk/commit/ebfc85272ab9c589d6a0ecb6dac5b59f931f3001))
* **cosmic-swingset:** flush slog senders after commit ([b57c1d2](https://github.com/Agoric/agoric-sdk/commit/b57c1d202367833a7de09af1ef1822b4b6481a78))
* **cosmic-swingset:** inboundQueue limit ([1b2d08f](https://github.com/Agoric/agoric-sdk/commit/1b2d08fcb4dd3de42f92358646d2c88e3b3687f5))
* **cosmic-swingset:** parse go->node send results as JSON ([2839223](https://github.com/Agoric/agoric-sdk/commit/2839223f4447deed7c32e73ca37ff142f7c563ef))


### Bug Fixes

* **cosmic-swingset:** check block params state ([525ad88](https://github.com/Agoric/agoric-sdk/commit/525ad88ec0aac91ebaa3d344f25ca11e9a6f3f39))
* add kernel stats as a slog entry at completion of each block ([8a38c52](https://github.com/Agoric/agoric-sdk/commit/8a38c52a0a4eb665e03fdba7c96e944221ab8bc9)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)
* avoid colliding with 'agoric' chain, e.g. in Keplr ([692084c](https://github.com/Agoric/agoric-sdk/commit/692084ce9328b11e23ab8b46025f83eb8d1b5b3d))
* **cosmic-swingset:** correctly handle missing slogSender ([808d8f8](https://github.com/Agoric/agoric-sdk/commit/808d8f8a944e946b7150883be7f66538048428b0))
* **telemetry:** forceFlush is async ([5cf56b9](https://github.com/Agoric/agoric-sdk/commit/5cf56b9d22a4e9436f1ce1b5020ea68071ef7f55))



## [0.38.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.37.0...@agoric/cosmic-swingset@0.38.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **run-protocol:** rename to inter-protocol

### Features

* **cosmic-swingset:** break up inbound queue processing ([e0d844d](https://github.com/Agoric/agoric-sdk/commit/e0d844da0cae132f63039404c42e5979c12977ce))
* **cosmic-swingset:** new `fund-provision-pool` target ([a8890db](https://github.com/Agoric/agoric-sdk/commit/a8890db5185ec5e6a729bd32c944b0fc9845ef3f))
* add env to keep old snapshots on disk ([96e1077](https://github.com/Agoric/agoric-sdk/commit/96e1077683c64ff0c66fdfaa3993043006c8f368))
* ensure voting via PSMCharter works with a unit test ([#6167](https://github.com/Agoric/agoric-sdk/issues/6167)) ([ff9471b](https://github.com/Agoric/agoric-sdk/commit/ff9471bf3a90ffab050e8b659d64d4cbd7c2d764))
* **cosmos:** pay per provisioning power flag ([b22417e](https://github.com/Agoric/agoric-sdk/commit/b22417ec638158945fb35cdfa2c14f56136b90df))
* add 'pinBootstrap' swingset configuration option ([131d74d](https://github.com/Agoric/agoric-sdk/commit/131d74d96570ac34feab74e26e682f36fe632dbc)), closes [#5771](https://github.com/Agoric/agoric-sdk/issues/5771)
* read only smart wallet ([#5741](https://github.com/Agoric/agoric-sdk/issues/5741)) ([9f3745d](https://github.com/Agoric/agoric-sdk/commit/9f3745da424424ff9a2e4c8f7b26bb0de89dd3eb))
* **cosmic-swingset:** Add chainStorage interface ([#5385](https://github.com/Agoric/agoric-sdk/issues/5385)) ([109ff65](https://github.com/Agoric/agoric-sdk/commit/109ff65845caaa503b03e2663437f62e7cdc686e)), closes [#4558](https://github.com/Agoric/agoric-sdk/issues/4558)
* **cosmic-swingset:** add commit-block slog events ([8335928](https://github.com/Agoric/agoric-sdk/commit/8335928e933b96dc7db78a0895a7582b93ef4f73))
* **cosmic-swingset:** Add heap snapshots ([42e43bc](https://github.com/Agoric/agoric-sdk/commit/42e43bce417a7538aa7bc6ed59320dfef45c1adb))
* **cosmic-swingset:** Add memory usage stats ([d8cf4af](https://github.com/Agoric/agoric-sdk/commit/d8cf4af39855b96febb45409d1b1598070cc56e6))
* **cosmic-swingset:** Force GC after block commit ([444325d](https://github.com/Agoric/agoric-sdk/commit/444325dcbef68d5c11e828a4950b2137ffa3c214))
* **swing-store:** Switch to lmdb-js ([89adc87](https://github.com/Agoric/agoric-sdk/commit/89adc87848494e78213d68194357c876b9ae4cf0))


### Bug Fixes

* **cosmic-swingset:** add inboundQueue metrics ([44db0eb](https://github.com/Agoric/agoric-sdk/commit/44db0eb07c5d9592e763b999ca3daff4bed91c0e)), closes [#6245](https://github.com/Agoric/agoric-sdk/issues/6245)
* **cosmic-swingset:** do not clear replayed chain sends ([cc76483](https://github.com/Agoric/agoric-sdk/commit/cc76483928f864d7230aff3544831e33d27e1ac0))
* **cosmic-swingset:** Fix consensus failure on bundle parse errors ([5f9eacf](https://github.com/Agoric/agoric-sdk/commit/5f9eacf7671053ad29e1eb3f9e80f908dff1c716)), closes [#6169](https://github.com/Agoric/agoric-sdk/issues/6169)
* **cosmic-swingset:** more meaningfull bootstrap height error ([ed1ece8](https://github.com/Agoric/agoric-sdk/commit/ed1ece81a804233f43010455fd35e43a2cb2ad2e))
* **wallet-ui:** get offer completion working again ([2e838a0](https://github.com/Agoric/agoric-sdk/commit/2e838a091b77b6f0adb77810c02a5b3f844a9307))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **cosmic-swingset:** Publish installation success and failure topic ([6a9f533](https://github.com/Agoric/agoric-sdk/commit/6a9f533b5b9095768f25b5642e001fd6e9aa8b47))
* **cosmic-swingset:** Use Endo debug mode for tests and scripts ([ab9728d](https://github.com/Agoric/agoric-sdk/commit/ab9728dab68c32b7eb953cc90d05712bd229eab3))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))


### Code Refactoring

* **run-protocol:** rename to inter-protocol ([f49b342](https://github.com/Agoric/agoric-sdk/commit/f49b342aa468e0cac08bb6cfd313918674e924d7))



## [0.37.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.36.0...@agoric/cosmic-swingset@0.37.0) (2022-05-28)


### ⚠ BREAKING CHANGES

* **extract-proposal:** insist on an explicit `entrypoint`

### Features

* **cosmic-swingset:** extract environment from swingset config ([151d8ba](https://github.com/Agoric/agoric-sdk/commit/151d8ba4be0e577b8f89bbcf5ac49a86aaa30e58))
* **cosmic-swingset:** Handle InstallBundle messages ([e3ae969](https://github.com/Agoric/agoric-sdk/commit/e3ae969e4824ad5fb43c18e17c6ed863743a08e2))
* **cosmic-swingset:** implement `make scenario2-run-chain-economy` ([82a6ee9](https://github.com/Agoric/agoric-sdk/commit/82a6ee9edba0eec562e12bd325b893010ddb94ce))
* **cosmic-swingset:** provide ibc assets to bootstrap, solo ([5985efb](https://github.com/Agoric/agoric-sdk/commit/5985efb5ecb2381029d1a11e7612ed40f3fee83d))


### Bug Fixes

* **cosmic-swingset:** generate economy config from core config ([bedb020](https://github.com/Agoric/agoric-sdk/commit/bedb020131a5f0b3f833a506097e6d3b80f36924))
* **cosmic-swingset:** start with more coins to avoid running out ([0216990](https://github.com/Agoric/agoric-sdk/commit/0216990980e51b8576078d45ba73a9ad57bb16d8))
* **extract-proposal:** insist on an explicit `entrypoint` ([02df38b](https://github.com/Agoric/agoric-sdk/commit/02df38b8a5ef96a78fd6ff7f5c20ffcdba161038))
* **launch-chain:** only load `coreProposals` when initializing SwingSet ([a0eafa9](https://github.com/Agoric/agoric-sdk/commit/a0eafa93600f354fccf49b18971c2db6eac5eb5f))
* **run-protocol:** adapt startPSM to core proposal conventions ([4e47405](https://github.com/Agoric/agoric-sdk/commit/4e474050d42727a2527026251fa40dd35a0db105))



## [0.36.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.35.0...@agoric/cosmic-swingset@0.36.0) (2022-05-09)


### Features

* Accept path for swingStore trace ([63a209c](https://github.com/Agoric/agoric-sdk/commit/63a209c8c7906f8be07f87aedf1313e607df7b42))
* Plumb env into makeSwingsetController ([53c2c93](https://github.com/Agoric/agoric-sdk/commit/53c2c93e6bf4fa569e1194c8a6126d187ecbdb84))
* **swingset:** Add swing store trace option ([25c7e79](https://github.com/Agoric/agoric-sdk/commit/25c7e79d699e8894a283518490add19f60840f4b))


### Bug Fixes

* **cosmic-swingset:** Fully drain actionQueue when recovering an interrupted block ([#5198](https://github.com/Agoric/agoric-sdk/issues/5198)) ([70c5463](https://github.com/Agoric/agoric-sdk/commit/70c5463d318288bec7d0947793f8cc24e676ef5b)), closes [#5196](https://github.com/Agoric/agoric-sdk/issues/5196)
* **cosmic-swingset:** stay alive with unresolved promise instead of 30s timer ([5ecbb51](https://github.com/Agoric/agoric-sdk/commit/5ecbb51cf099ab65365085b82337879b54449045))
* **extract-proposal:** make results deterministic ([8fba48a](https://github.com/Agoric/agoric-sdk/commit/8fba48ae6182b31b5d595f193d1f9209a7e56455))



## [0.35.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.6...@agoric/cosmic-swingset@0.35.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* **cosmic-swingset:** `extractCoreProposalBundles` for bootstrap ([4e30195](https://github.com/Agoric/agoric-sdk/commit/4e30195fabf38600522eaa6ea8ec9a7ff8eaa457))
* **cosmic-swingset:** grant addVaultType based on addr ([#4641](https://github.com/Agoric/agoric-sdk/issues/4641)) ([e439024](https://github.com/Agoric/agoric-sdk/commit/e439024788f27ea668b2ff0c5e486ab901807eb0))
* **cosmic-swingset:** new `scripts/clean-core-eval.js` ([b2b0b5a](https://github.com/Agoric/agoric-sdk/commit/b2b0b5aecfcccd23121b04b72ec396f4533a46ed))
* **deploy-script-suppport:** e2e `writeCoreProposal` ([88a0cf7](https://github.com/Agoric/agoric-sdk/commit/88a0cf70c9078f0e9e2c46a6cc30bcb736e6e379))
* **runStake:** checkGov to find, e.g. SES_IMPORT_REJECTED ([f20addf](https://github.com/Agoric/agoric-sdk/commit/f20addf2269e63bcdeddae9e5d8caa27eb859d9e))
* **SOLO_OTEL_EXPORTER_PROMETHEUS_PORT:** new env var ([46f0a31](https://github.com/Agoric/agoric-sdk/commit/46f0a3188149b32dccec14a5c5d02b8b35ca2494))
* **SwingSet:** report empty cranks to run policy ([5b7a694](https://github.com/Agoric/agoric-sdk/commit/5b7a694c6291c45e24ec1bc8f8e5eeacca0ef8c5))
* **telemetry:** upgrade to latest `[@opentelemetry](https://github.com/opentelemetry)` ([de82224](https://github.com/Agoric/agoric-sdk/commit/de82224eb08a40e139f20e74d6f1038e50fbfa40))


### Bug Fixes

* **cosmic-swingset:** give much more RUN to the local-solo ([f1e3fda](https://github.com/Agoric/agoric-sdk/commit/f1e3fdafb5d137b1b06f6e1394b2e9794d235e29))
* rip out the remainder of consensusMode ([744b561](https://github.com/Agoric/agoric-sdk/commit/744b561016567a1c6a82392bcb8a86e02f35b7b1))
* **cosmic-swingset:** update deep-import paths ([9c6d902](https://github.com/Agoric/agoric-sdk/commit/9c6d902c86ccbeca4ee77d43746ea0b196b1e8f7))
* **telemetry:** rework Prometheus metrics ([38a1922](https://github.com/Agoric/agoric-sdk/commit/38a1922ce2c21e4f31b4a1bedd634bbe627990f9))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.34.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.5...@agoric/cosmic-swingset@0.34.6) (2022-02-24)


### Features

* **cosmic-swingset:** add tools for core-eval governance ([7368aa6](https://github.com/Agoric/agoric-sdk/commit/7368aa6c22be840733843b1da125eb659cc21d84))
* **cosmos:** robustly handle kvstore rollback ([c58ddb4](https://github.com/Agoric/agoric-sdk/commit/c58ddb490229741e57ef2130493608cbe9b13d4c))


### Bug Fixes

* **cosmic-swingset:** handle begin/end block without explicit queue ([05352e9](https://github.com/Agoric/agoric-sdk/commit/05352e99d7b9488f756103979ec4632d53ff7d3d))



### [0.34.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.4...@agoric/cosmic-swingset@0.34.5) (2022-02-21)


### Features

* **cosmic-swingset:** honour `CHAIN_BOOTSTRAP_VAT_CONFIG` ([cf93481](https://github.com/Agoric/agoric-sdk/commit/cf93481969043948985e21a78d1680bc7925cd62))
* **cosmic-swingset:** use `bootMsg.params.bootstrap_vat_config` ([28d3efd](https://github.com/Agoric/agoric-sdk/commit/28d3efdab7f7f91e17ba49cdb57408988dc5c58e))
* **solo:** run sim-chain in a separate process ([a9bc83d](https://github.com/Agoric/agoric-sdk/commit/a9bc83dc8f74a77a39feef4f1de45a0eee9439ae))
* **swing-store:** enable `LMDB_MAP_SIZE` and `SOLO_LMDB_MAP_SIZE` ([77f67a8](https://github.com/Agoric/agoric-sdk/commit/77f67a8010d84b4f595e1fbd524b344050ae47d6))
* **telemetry:** use `makeSlogSenderFromModule` ([2892da9](https://github.com/Agoric/agoric-sdk/commit/2892da96eff902c5f616424d6fb9946aaaef1b0f))


### Bug Fixes

* **anylogger:** coherent DEBUG levels, `$DEBUG` always says more ([5e482fe](https://github.com/Agoric/agoric-sdk/commit/5e482feb3912a0a3dd409d5f028ebe17e6b8ec0b))
* **cosmic-swingset:** enforce consensusMode, not by sniffing `$DEBUG` ([960aa17](https://github.com/Agoric/agoric-sdk/commit/960aa173c33fedead0ff22e32971798c2f01a911))
* **cosmic-swingset:** straighten out shutdown signals and exit code ([118fc21](https://github.com/Agoric/agoric-sdk/commit/118fc21b62b8f03333831640c60d508b79790bd5))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* **cosmic-swingset:** use `@agoric/telemetry` ([e22742a](https://github.com/Agoric/agoric-sdk/commit/e22742a73949d63d599ba6e9e433624a31582d86))
* make `default-params.go` match `sim-params.js` ([550ba3a](https://github.com/Agoric/agoric-sdk/commit/550ba3a058cc2f7e0200479c6c3ceaf5dc39e21e))
* **sim-params:** update parameters to charge higher SwingSet fees ([341ddbb](https://github.com/Agoric/agoric-sdk/commit/341ddbbf43637c38eb194f3e7c6fd20fb1e5cb4e))



### [0.34.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.3...@agoric/cosmic-swingset@0.34.4) (2021-12-22)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.34.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.2...@agoric/cosmic-swingset@0.34.3) (2021-12-02)


### Features

* **agoric-cli:** enable the `agoric start --debug` option ([4f89a5b](https://github.com/Agoric/agoric-sdk/commit/4f89a5bc2250fb0d5cf64e937d2335b1a3857c7a))
* **beans:** use `sdk.Uint` whole beans to prevent negatives ([46f7fdc](https://github.com/Agoric/agoric-sdk/commit/46f7fdc9a03473c55cacf9d09251d52c71237842))
* **cosmic-swingset:** avoid accidentally running under debugger ([e4a6f4c](https://github.com/Agoric/agoric-sdk/commit/e4a6f4c4bfabf28f3ac7375c30fd06e97756197f))
* **cosmic-swingset:** use `beans_per_unit` and `fee_unit_price` ([58218de](https://github.com/Agoric/agoric-sdk/commit/58218de58b9fcfa9f941c102c2f66c31837a0b13))
* **cosmic-swingset:** use governance params instead of constants ([2c20748](https://github.com/Agoric/agoric-sdk/commit/2c207481a2a91cf4ad2924fb946910f1cdaa5806))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))


### Bug Fixes

* **cosmic-swingset:** decohere if there are leftover actions ([32f879b](https://github.com/Agoric/agoric-sdk/commit/32f879b23565ac28b8aabe5c2c2760526826c3ac))
* **cosmic-swingset:** have `make install` do what you expect ([08e9d74](https://github.com/Agoric/agoric-sdk/commit/08e9d74d59a7acc8782ecf5624c5102457ea8260))
* **cosmos:** make a repeated array of entries for `beans_per_unit` ([fa96b9a](https://github.com/Agoric/agoric-sdk/commit/fa96b9a369c595cdf6b09e9b57aaad7c06003709))
* **deps:** remove explicit `@agoric/babel-standalone` ([4f22453](https://github.com/Agoric/agoric-sdk/commit/4f22453a6f2de1a2c27ae8ad0d11b13116890dab))



### [0.34.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.1...@agoric/cosmic-swingset@0.34.2) (2021-10-13)


### Features

* **agoricd:** add new Golang binary without any SwingSet ([26c9994](https://github.com/Agoric/agoric-sdk/commit/26c99948edf4579aab124c3e74f350747e54b840))
* stateless lien module that upcalls to kernel ([603c0cf](https://github.com/Agoric/agoric-sdk/commit/603c0cfc8d2b4706dbbaa42d2ae057fa9dea65dc))


### Bug Fixes

* address review comments ([8af3e15](https://github.com/Agoric/agoric-sdk/commit/8af3e1547b4df32c604f6b628a62bff230666166))
* lien accounts must proxy all account methods ([db79c42](https://github.com/Agoric/agoric-sdk/commit/db79c42398195a09e8b3953dad35224f0943752b))



### [0.34.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.34.0...@agoric/cosmic-swingset@0.34.1) (2021-09-23)


### Features

* **solo:** make client objects appear earlier, parallelise chain ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5937389c57e139bc1302fa435edd2e674))


### Bug Fixes

* **sim-chain:** update `chainTimerService` correctly ([3f49a77](https://github.com/Agoric/agoric-sdk/commit/3f49a779f253ff01fe7e71d0295efbfa99b669a9))



## [0.34.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.5...@agoric/cosmic-swingset@0.34.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* **issuers:** clean up issuers for demo
* clean up organization of swing-store

### Features

* **issuers:** clean up issuers for demo ([228cf1a](https://github.com/Agoric/agoric-sdk/commit/228cf1a80d100e653460823cae62fdd547447cb3))


### Code Refactoring

* clean up organization of swing-store ([3c7e57b](https://github.com/Agoric/agoric-sdk/commit/3c7e57b8f62c0b93660dd57c002ffb96c2cd4137))



### [0.33.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.4...@agoric/cosmic-swingset@0.33.5) (2021-08-21)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.33.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.3...@agoric/cosmic-swingset@0.33.4) (2021-08-21)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.33.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.2...@agoric/cosmic-swingset@0.33.3) (2021-08-18)


### Bug Fixes

* **cosmic-swingset:** provide 50 RUN to provisioned clients ([ae092a4](https://github.com/Agoric/agoric-sdk/commit/ae092a47ad67163f42cde527066c29884320421a))



### [0.33.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.1...@agoric/cosmic-swingset@0.33.2) (2021-08-17)


### Features

* **cosmic-swingset:** provide RUN for sim-chain ([6d27815](https://github.com/Agoric/agoric-sdk/commit/6d2781520b1987c0a9529b300c3a368c09557ee9)), closes [#3266](https://github.com/Agoric/agoric-sdk/issues/3266)



### [0.33.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.33.0...@agoric/cosmic-swingset@0.33.1) (2021-08-16)

**Note:** Version bump only for package @agoric/cosmic-swingset





## [0.33.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.9...@agoric/cosmic-swingset@0.33.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Features

* **cosmic-swingset:** add swingset 'activityhash' to state vector ([5247326](https://github.com/Agoric/agoric-sdk/commit/52473260cf6df736565e93b39afbc42295e0b7b6)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **cosmic-swingset:** include activityhash for initial block too ([a8d2412](https://github.com/Agoric/agoric-sdk/commit/a8d2412e3dcd25396d3a751bd04755d1186d3e1f))
* **cosmic-swingset:** use compute meter to decide where blocks end ([#3651](https://github.com/Agoric/agoric-sdk/issues/3651)) ([5f7317c](https://github.com/Agoric/agoric-sdk/commit/5f7317c0d1179f9d9f1ef1e9f7e7ecc887e1f53f)), closes [#3582](https://github.com/Agoric/agoric-sdk/issues/3582)


### Bug Fixes

* **cosmic-swingset:** fix more places that need -ojson ([aa2da0e](https://github.com/Agoric/agoric-sdk/commit/aa2da0e8bfb2eed27c84f093dcccfdf00aa85d8b))
* **cosmic-swingset:** port more scripts to ESM ([fc062b8](https://github.com/Agoric/agoric-sdk/commit/fc062b8a87875409008aae04af921a338926511b))
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* **cosmic-swingset:** pass consensusMode to SwingSet on chain ([33ff03c](https://github.com/Agoric/agoric-sdk/commit/33ff03cb655f80dcee10e816c23741da9bd250ea))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))


### Bug Fixes

* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **cosmic-swingset:** properly detect when the chain is available ([83f3a5d](https://github.com/Agoric/agoric-sdk/commit/83f3a5d7ad035183c0e6ae71003ed73daaaafeee))
* **cosmic-swingset:** use `cosmic-swingset-bootstrap-block-finish` ([a789b02](https://github.com/Agoric/agoric-sdk/commit/a789b020cb33d4b9b8941b970784d7db5b0f62ae))
* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))
* provide Makefile targets to use separate fee and client auth ([935f7b1](https://github.com/Agoric/agoric-sdk/commit/935f7b1e364ccc9e85d7ed2f745bec317073de05))
* **cosmic-swingset:** use default batching parameters for sim-chain ([e16e7a7](https://github.com/Agoric/agoric-sdk/commit/e16e7a77910e5c0af647be30cdaa360ce7bff0f8))



## [0.32.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.9...@agoric/cosmic-swingset@0.32.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Features

* **cosmic-swingset:** add swingset 'activityhash' to state vector ([5247326](https://github.com/Agoric/agoric-sdk/commit/52473260cf6df736565e93b39afbc42295e0b7b6)), closes [#3442](https://github.com/Agoric/agoric-sdk/issues/3442)
* **cosmic-swingset:** include activityhash for initial block too ([a8d2412](https://github.com/Agoric/agoric-sdk/commit/a8d2412e3dcd25396d3a751bd04755d1186d3e1f))
* **cosmic-swingset:** use compute meter to decide where blocks end ([#3651](https://github.com/Agoric/agoric-sdk/issues/3651)) ([5f7317c](https://github.com/Agoric/agoric-sdk/commit/5f7317c0d1179f9d9f1ef1e9f7e7ecc887e1f53f)), closes [#3582](https://github.com/Agoric/agoric-sdk/issues/3582)


### Bug Fixes

* **cosmic-swingset:** port more scripts to ESM ([fc062b8](https://github.com/Agoric/agoric-sdk/commit/fc062b8a87875409008aae04af921a338926511b))
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* **cosmic-swingset:** pass consensusMode to SwingSet on chain ([33ff03c](https://github.com/Agoric/agoric-sdk/commit/33ff03cb655f80dcee10e816c23741da9bd250ea))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))


### Bug Fixes

* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **cosmic-swingset:** properly detect when the chain is available ([83f3a5d](https://github.com/Agoric/agoric-sdk/commit/83f3a5d7ad035183c0e6ae71003ed73daaaafeee))
* **cosmic-swingset:** use `cosmic-swingset-bootstrap-block-finish` ([a789b02](https://github.com/Agoric/agoric-sdk/commit/a789b020cb33d4b9b8941b970784d7db5b0f62ae))
* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))
* provide Makefile targets to use separate fee and client auth ([935f7b1](https://github.com/Agoric/agoric-sdk/commit/935f7b1e364ccc9e85d7ed2f745bec317073de05))
* **cosmic-swingset:** use default batching parameters for sim-chain ([e16e7a7](https://github.com/Agoric/agoric-sdk/commit/e16e7a77910e5c0af647be30cdaa360ce7bff0f8))



### [0.31.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.9...@agoric/cosmic-swingset@0.31.10) (2021-07-28)


### Features

* **cosmic-swingset:** pass consensusMode to SwingSet on chain ([33ff03c](https://github.com/Agoric/agoric-sdk/commit/33ff03cb655f80dcee10e816c23741da9bd250ea))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))
* **SwingSet:** new `overrideVatManagerOptions` kernel option ([1ec045b](https://github.com/Agoric/agoric-sdk/commit/1ec045bad58ee7b5e9fccf36782793a3dd780337))


### Bug Fixes

* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **cosmic-swingset:** properly detect when the chain is available ([83f3a5d](https://github.com/Agoric/agoric-sdk/commit/83f3a5d7ad035183c0e6ae71003ed73daaaafeee))
* **cosmic-swingset:** use `cosmic-swingset-bootstrap-block-finish` ([a789b02](https://github.com/Agoric/agoric-sdk/commit/a789b020cb33d4b9b8941b970784d7db5b0f62ae))
* **cosmic-swingset:** use BOOTSTRAP_BLOCK to avoid slog confusion ([9c8725b](https://github.com/Agoric/agoric-sdk/commit/9c8725bae6ff4038052f33947da77d3eddc0351d))
* provide Makefile targets to use separate fee and client auth ([935f7b1](https://github.com/Agoric/agoric-sdk/commit/935f7b1e364ccc9e85d7ed2f745bec317073de05))
* **cosmic-swingset:** use default batching parameters for sim-chain ([e16e7a7](https://github.com/Agoric/agoric-sdk/commit/e16e7a77910e5c0af647be30cdaa360ce7bff0f8))



### [0.31.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.8...@agoric/cosmic-swingset@0.31.9) (2021-07-01)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.31.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.7...@agoric/cosmic-swingset@0.31.8) (2021-07-01)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.31.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.6...@agoric/cosmic-swingset@0.31.7) (2021-06-28)


### Features

* demand-paged vats are reloaded from heap snapshots ([#2848](https://github.com/Agoric/agoric-sdk/issues/2848)) ([cb239cb](https://github.com/Agoric/agoric-sdk/commit/cb239cbb27943ad58c304d85ee9b61ba917af79c)), closes [#2273](https://github.com/Agoric/agoric-sdk/issues/2273) [#2277](https://github.com/Agoric/agoric-sdk/issues/2277) [#2422](https://github.com/Agoric/agoric-sdk/issues/2422)



### [0.31.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.5...@agoric/cosmic-swingset@0.31.6) (2021-06-25)


### Bug Fixes

* **cosmic-swingset:** update check-validator.js for Cosmos 0.43.x ([7b94577](https://github.com/Agoric/agoric-sdk/commit/7b9457708ea1d0ecc78fb71a77d700ac8cfbbc04))



### [0.31.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.4...@agoric/cosmic-swingset@0.31.5) (2021-06-24)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.31.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.3...@agoric/cosmic-swingset@0.31.4) (2021-06-24)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.31.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.2...@agoric/cosmic-swingset@0.31.3) (2021-06-23)


### Bug Fixes

* **cosmic-swingset:** stop using install-metering-and-ses ([3317007](https://github.com/Agoric/agoric-sdk/commit/331700772a3c679643f5cd66a2b9d17b40b4ec1e)), closes [#3373](https://github.com/Agoric/agoric-sdk/issues/3373)
* move COMMIT_BLOCK immediately before the Cosmos SDK commit ([f0d2e68](https://github.com/Agoric/agoric-sdk/commit/f0d2e686a68cffbee2e97697594a7669051f0b40))



### [0.31.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.1...@agoric/cosmic-swingset@0.31.2) (2021-06-16)

**Note:** Version bump only for package @agoric/cosmic-swingset





### [0.31.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.31.0...@agoric/cosmic-swingset@0.31.1) (2021-06-15)


### Features

* modify all SwingStore uses to reflect constructor renaming ([9cda6a4](https://github.com/Agoric/agoric-sdk/commit/9cda6a4542bb64d72ddd42d08e2056f5323b18a9))
* remove no-LMDB fallback from cosmic-swingset ([11dba7a](https://github.com/Agoric/agoric-sdk/commit/11dba7a145711097966ed41b9d36dd2ffdad2846))


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* remove genesis bootstrap config; use just add-genesis-account ([fdc1255](https://github.com/Agoric/agoric-sdk/commit/fdc1255d66c702e8970ecf795be191dcf2291c39))
* **cosmic-swingset:** slog begin/end-block and input events ([cc77234](https://github.com/Agoric/agoric-sdk/commit/cc77234b3d56b629ef4183990db798e78545526c))
* update cosmic swingset build instructions ([29fdec4](https://github.com/Agoric/agoric-sdk/commit/29fdec40d6db374385e0a40d2e635a27d1828adb))



# [0.31.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.30.1...@agoric/cosmic-swingset@0.31.0) (2021-05-10)


### Bug Fixes

* make scenario2-run-client is now idempotent ([5f08b89](https://github.com/Agoric/agoric-sdk/commit/5f08b8960499af0143431ee9f5b4b85d4fc34841))


### Features

* add a check-validator.js script to verify node keys ([73248c2](https://github.com/Agoric/agoric-sdk/commit/73248c2b92c42673344c80085916367c8bef4f60))





## [0.30.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.30.0...@agoric/cosmic-swingset@0.30.1) (2021-05-05)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.30.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.29.4...@agoric/cosmic-swingset@0.30.0) (2021-05-05)


### Bug Fixes

* adjust git-revision.txt generation ([6a8b0f2](https://github.com/Agoric/agoric-sdk/commit/6a8b0f20df17d5427b1c70273bcc170c7945dc2a))
* clean up Docker directory usage ([a97d0b3](https://github.com/Agoric/agoric-sdk/commit/a97d0b3edc1f47e04d93d37c6e999d0798903d03))
* don't get GCI from gci.js; use kernel argv.FIXME_GCI instead ([f994574](https://github.com/Agoric/agoric-sdk/commit/f9945744f70e0c535b36173ebb4754fbc18888cf))
* eliminate urun from cosmos bootstrap (it comes from treasury) ([16c1694](https://github.com/Agoric/agoric-sdk/commit/16c169446602a187810949748915eca31894fcb9))
* use agoric set-defaults --bootstrap-address ([4f96b2c](https://github.com/Agoric/agoric-sdk/commit/4f96b2c1e890432eb0da90578157e9a317d44f45))
* **cosmic-swingset:** finish reorganization ([7aa778f](https://github.com/Agoric/agoric-sdk/commit/7aa778fa1c88835a3b5c17c34ef010921630f342))
* **spawner:** rewrite to use createVat, strip down to bare minimum API ([86c0a58](https://github.com/Agoric/agoric-sdk/commit/86c0a58a588a7fa9b07c18c8038935b7bc6175cf)), closes [#1343](https://github.com/Agoric/agoric-sdk/issues/1343)


### Features

* add bank assets for "cosmos" issuers (currently BLD) ([3148b83](https://github.com/Agoric/agoric-sdk/commit/3148b8337db517e0908b07df93c9b7d497ddcf40))
* add home.bank and home.bankManager ([276a1d3](https://github.com/Agoric/agoric-sdk/commit/276a1d3eb28fe83b1f59ca329e645aa1e9686849))
* handle VPURSE_BALANCE_UPDATE ([116fcd2](https://github.com/Agoric/agoric-sdk/commit/116fcd2b50a824fb4c8b5a0bac41d6798855d03e))
* have the bank use normal purses when not on chain ([90ab888](https://github.com/Agoric/agoric-sdk/commit/90ab888c5cdc71a2322ca05ad813c6411c876a74))
* **cosmic-swingset:** $SLOGFILE will make the chain write a slogfile ([c845132](https://github.com/Agoric/agoric-sdk/commit/c8451329294ee91330914befd63690ec94964607))
* **vpurse:** connect to golang ([d2f719d](https://github.com/Agoric/agoric-sdk/commit/d2f719dce9936a129817a3781bc1de8c4367bb46))
* have the wallet-bridge.html announce it was loaded ([36d9f0f](https://github.com/Agoric/agoric-sdk/commit/36d9f0f9744d22587fe01031a66f51f7f8e64099))





## [0.29.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.29.3...@agoric/cosmic-swingset@0.29.4) (2021-04-22)


### Bug Fixes

* rename cosmos-level tokens uagstake/uag to ubld/urun ([0557983](https://github.com/Agoric/agoric-sdk/commit/0557983210571c9c2ba801d68644d71641a3f790))
* reorganise deployment ([5e7f537](https://github.com/Agoric/agoric-sdk/commit/5e7f537021f747327673b6f5819324eb048a3d96))





## [0.29.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.29.2...@agoric/cosmic-swingset@0.29.3) (2021-04-18)


### Bug Fixes

* accommodate initial_height == "1" as well as > "1" ([65a1c62](https://github.com/Agoric/agoric-sdk/commit/65a1c62999cf59300dd552047fc02ee13c0af288))
* again harmonise fake-chain with Cosmos genesis behaviour ([69782b8](https://github.com/Agoric/agoric-sdk/commit/69782b860047f7f7a0fd23f2e554890dd4e1949b))





## [0.29.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.29.1...@agoric/cosmic-swingset@0.29.2) (2021-04-16)


### Bug Fixes

* harmonise fake-chain and actual chain genesis block height ([8903f3b](https://github.com/Agoric/agoric-sdk/commit/8903f3b861b9c1bb92e551875ff2ae020c11b00f))





## [0.29.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.29.0...@agoric/cosmic-swingset@0.29.1) (2021-04-14)


### Bug Fixes

* small tweaks needed for agorictest-8 ([b8d2ec0](https://github.com/Agoric/agoric-sdk/commit/b8d2ec008b59f0de68602a4338ceafa6a3a92e2d))





# [0.29.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.28.1...@agoric/cosmic-swingset@0.29.0) (2021-04-13)


### Bug Fixes

* don't invoke kernel before first actual chain block ([a27393f](https://github.com/Agoric/agoric-sdk/commit/a27393f212e9b28f519347ce98be0f4e428ebed1))
* ensure unique (but fake) addresses for sim-chain ([1a5f5c0](https://github.com/Agoric/agoric-sdk/commit/1a5f5c0eaf2964764ec755afd86c9dc1ba56c8d7))
* fully implement onInbound for unique connection ID ([421b9d4](https://github.com/Agoric/agoric-sdk/commit/421b9d432e26670f223518acbaf7d9bd55d63ca3))
* genesis has height 0, so properly detect the first block ([5b524da](https://github.com/Agoric/agoric-sdk/commit/5b524da80be6becbf6d4da7992c3be3e551431a6))
* honour logging sent exceptions with DEBUG=SwingSet:ls ([db9b46a](https://github.com/Agoric/agoric-sdk/commit/db9b46af0a01eac00941f8c902ceedfb3a9938f6))
* optimise the scenario2 setup by preferring ag-cosmos-helper ([24f0a59](https://github.com/Agoric/agoric-sdk/commit/24f0a59c5dcc1784517cb5209779c7d95f56d63d))
* properly disable devices.bridge for the sim-chain ([20d61cc](https://github.com/Agoric/agoric-sdk/commit/20d61cce9a15d473fce7c6f904cfefaf8dfca657))


### Features

* install Pegasus on "transfer" IBC port ([a257216](https://github.com/Agoric/agoric-sdk/commit/a2572163878bad9c6ba11914e02b8aacfefedeba))
* **network:** allow onInstantiate to augment localAddress ([9cfc2fd](https://github.com/Agoric/agoric-sdk/commit/9cfc2fd58e9bd9076d4dc91af46b65e4c5729e54))
* install Pegasus on chain bootstrap ([7615292](https://github.com/Agoric/agoric-sdk/commit/76152926942f9c0610ab3d08a45c464856779643))
* integrate pegasus in chain bootstrap ([5c7ecba](https://github.com/Agoric/agoric-sdk/commit/5c7ecba05d0e6ec7ef9fe127ee89e0c79d3e6511))
* make nameHub entries, keys, and values available ([933c599](https://github.com/Agoric/agoric-sdk/commit/933c5993ca3d305572d720b4947715a9d6b9bede))





## [0.28.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.28.0...@agoric/cosmic-swingset@0.28.1) (2021-04-07)


### Bug Fixes

* change the fake quote timer to 5min ([#2828](https://github.com/Agoric/agoric-sdk/issues/2828)) ([66d22db](https://github.com/Agoric/agoric-sdk/commit/66d22dbf44c11ed21a85c5cfce6c531fd29e8052))





# [0.28.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.27.0...@agoric/cosmic-swingset@0.28.0) (2021-04-06)


### Bug Fixes

* adjust collateral additions for more realism ([fcf5295](https://github.com/Agoric/agoric-sdk/commit/fcf5295280d7bcde49f5a4943cd324ac55c8e0ca))
* fully bootstrap the chain before allowing inbound messages ([ff7b8bf](https://github.com/Agoric/agoric-sdk/commit/ff7b8bf92b92729de1dd81d5a1d8618a6ac787df))
* improve factoring and assertions ([e7b356d](https://github.com/Agoric/agoric-sdk/commit/e7b356d608e7a774fb326e0b8988c7c79b938e72))
* use SWINGSET_WORKER_TYPE to avoid WORKER_TYPE ambiguity ([c4616f1](https://github.com/Agoric/agoric-sdk/commit/c4616f1db0f2668eef5dbb97e30800d4e9caf3a0))


### Features

* add collateralConfig to issuer entries and enact ([8ce966b](https://github.com/Agoric/agoric-sdk/commit/8ce966bdb4f74960189b73d0721e92ae3c5912f0))
* add home.agoricNames and home.agoricNamesAdmin ([04c5bdd](https://github.com/Agoric/agoric-sdk/commit/04c5bddaae2e482793c8cc584385a841dd9f4b17))
* add more collateral types, pivot to BLD/RUN and decimals ([7cbce9f](https://github.com/Agoric/agoric-sdk/commit/7cbce9f53fc81d273d3ebd7c78d93caedbd23b2e))
* add more issuers ([87d2fba](https://github.com/Agoric/agoric-sdk/commit/87d2fbacdb910527cca7b0669cc1a2123b31fd67))
* add namesByAddress and myAddressNameAdmin ([945a6c3](https://github.com/Agoric/agoric-sdk/commit/945a6c3aa58146dc1909df3793d417b288c6e1de))
* implement and test makeNameHubKit as specified ([7deac62](https://github.com/Agoric/agoric-sdk/commit/7deac62b5921a2e71d602ec2201938de2625b7be))
* integrate the economy's central token in chain bootstrap ([2288e60](https://github.com/Agoric/agoric-sdk/commit/2288e60bf2d85e2c9c9b08c479dbaad41284f55d))
* stop the fake-chain dead if the kernel fails ([fac485e](https://github.com/Agoric/agoric-sdk/commit/fac485ecdd6749eb1f81f0611d0faa927005ea94))
* use multipoolAutoswap as the treasury priceAuthority ([a37c795](https://github.com/Agoric/agoric-sdk/commit/a37c795a98f38ac99581d441e00177364f404bd3))
* use same (instrumented) kernel stepper for bootstrap ([33d42a8](https://github.com/Agoric/agoric-sdk/commit/33d42a8df1f0b7202b51dc552e48327abbb21ef0))
* **cosmic-swingset:** xs-worker option in ag-solo, chain ([cbf8e56](https://github.com/Agoric/agoric-sdk/commit/cbf8e56b63e32c2102be33fc434d46ee031ccebd))





# [0.27.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.26.0...@agoric/cosmic-swingset@0.27.0) (2021-03-24)


### Bug Fixes

* **kernel-stats:** don't record Prometheus vatID labels ([9af77d1](https://github.com/Agoric/agoric-sdk/commit/9af77d18e8072c71e0ca814fbf38e667c1e7b407))
* downgrade the sim-chain trip log severity ([49f4f0a](https://github.com/Agoric/agoric-sdk/commit/49f4f0a94fdd695416a6a259c5673cf41051f6d4))
* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)


### Features

* agoric client docker-compose config ([#2701](https://github.com/Agoric/agoric-sdk/issues/2701)) ([c9ae4fd](https://github.com/Agoric/agoric-sdk/commit/c9ae4fdb5218a80db9225785279daeb152510af1))
* generalise the grouped metrics and refactor ([877ffac](https://github.com/Agoric/agoric-sdk/commit/877ffac1cf1dcf5500a69644acb617df35db54ec))
* **SwingSet:** track the meter usage in deliverResults[2] ([c1a2388](https://github.com/Agoric/agoric-sdk/commit/c1a23887ca016007ff5ab38f77b8d9f560ce43a8))
* introduce Makefile variable $(OTEL_EXPORTER_PROMETHEUS_PORT) ([6cc2e4f](https://github.com/Agoric/agoric-sdk/commit/6cc2e4f36f7bb13fc7493021fe33a2962368b0b2))
* introduce slogCallbacks for the host to handle slog calls ([e2eb92e](https://github.com/Agoric/agoric-sdk/commit/e2eb92e1833b0623045b25b8de7a971cc8c9eba4))





# [0.26.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.25.1...@agoric/cosmic-swingset@0.26.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **cosmic-swingset:** apply Far/Data as necessary ([#2567](https://github.com/Agoric/agoric-sdk/issues/2567)) ([92b63b6](https://github.com/Agoric/agoric-sdk/commit/92b63b6105c055b14bb5412c9ebf12f213896244)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018) [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)
* better ocap discipline ([eef6540](https://github.com/Agoric/agoric-sdk/commit/eef654080e7e45d04e9783f08e5216fc9dad54b9))
* don't rely on OS exec semantics for agoric-cli; fork instead ([4820958](https://github.com/Agoric/agoric-sdk/commit/4820958ebfab4d91ba3481f884926217a861967d))
* make init-basedir more tolerant to paths ([a7e15ff](https://github.com/Agoric/agoric-sdk/commit/a7e15ffd27cdb8497dc9a881103113ce7a1938fd))
* use os.homedir() to properly cope with Windows ([fcf93ad](https://github.com/Agoric/agoric-sdk/commit/fcf93ad6eb137d9a055995d1b369a0d23c925aff))


### Features

* allow fresh access tokens to override stale ones ([98acaee](https://github.com/Agoric/agoric-sdk/commit/98acaeed7f3d33a7f4631292b9187e3b4a1df7b6))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))
* silence the vat logs for ag-chain-cosmos ([16cf2bb](https://github.com/Agoric/agoric-sdk/commit/16cf2bb7105cd5659a89d2c6e690a416e88df5c4))





## [0.25.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.25.0...@agoric/cosmic-swingset@0.25.1) (2021-02-22)


### Bug Fixes

* **cosmic-swingset:** Use 'junction' symlinks for directories ([1446df8](https://github.com/Agoric/agoric-sdk/commit/1446df8dfad115ef9a5a47349cd0b4c4d8a14e7b))



# 0.24.0 (2021-02-17)


### Bug Fixes

* update kernel stats descriptions for kpFulfilled ([b4ed286](https://github.com/Agoric/agoric-sdk/commit/b4ed2861c29b92f9c255fb2cf443c0abab4b8e68))





# [0.25.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.24.0...@agoric/cosmic-swingset@0.25.0) (2021-02-16)


### Bug Fixes

* adapt to new cosmos-sdk ([3b12c9e](https://github.com/Agoric/agoric-sdk/commit/3b12c9e2ef33117206189ecd085f51523c7d0d87))
* add more metrics ([e3223fb](https://github.com/Agoric/agoric-sdk/commit/e3223fb25a672e002128e9a4d13d3a0da62cb872))
* be more tolerant of errors ([967832e](https://github.com/Agoric/agoric-sdk/commit/967832e17010b0fec30a0bf80d2cb740406c4dbb))
* configure go relayer properly with add-paths ([7f2bd5b](https://github.com/Agoric/agoric-sdk/commit/7f2bd5bb41435a97bdb6256dc7bdccb45bb390dc))
* limit number of kernel steps per block ([a0f4588](https://github.com/Agoric/agoric-sdk/commit/a0f45880cc515c6a7f9333c670a3c1d9bdf35834))
* make HTTP replies more robust ([4b98e64](https://github.com/Agoric/agoric-sdk/commit/4b98e64412499bccd016b86eaa48abd21dc35b03))
* message batches reduce wallet setup from 80 to 20 chain trips ([7d17f2f](https://github.com/Agoric/agoric-sdk/commit/7d17f2f5f7585adb5ae02a26489ef2e9abe7c5bb))
* motivate some changes, drop an extraneous JSON-laundering ([6a1dfe0](https://github.com/Agoric/agoric-sdk/commit/6a1dfe08cb061216cd90cdec5a52cf84c451e95e))
* prefix Prometheus metrics with swingset_ ([73238dc](https://github.com/Agoric/agoric-sdk/commit/73238dc75e699bc7e888f1d8080ea20f1e2f483e))
* prevent device node leaks and stale urlHandlers ([a2825ac](https://github.com/Agoric/agoric-sdk/commit/a2825ace27d51fa1d6421a995cc38af346b2c03c))
* properly honour FIXME_MAX_CRANKS_PER_BLOCK ([60be251](https://github.com/Agoric/agoric-sdk/commit/60be25159f6786d5f911502aefdaa7ab7fd3cb6f))
* review comments ([17d7df6](https://github.com/Agoric/agoric-sdk/commit/17d7df6ee06eb5c340500bb5582f985c2993ab19))
* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* speed up sim-chain when no configured inter-block delay ([8c7dd1e](https://github.com/Agoric/agoric-sdk/commit/8c7dd1eda1d864c89208256f27aaee3712f77d17))
* update dibc for v0.41.0 ([d990c14](https://github.com/Agoric/agoric-sdk/commit/d990c145ddcef3b090c63879a96a1942bc4ae69c))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))
* wire through the CapTP bootstrap message ([7af41bc](https://github.com/Agoric/agoric-sdk/commit/7af41bc13a778c4872863e2060874910d6c1fefa))


### Features

* add a notifier to the timerService ([#2143](https://github.com/Agoric/agoric-sdk/issues/2143)) ([3cb4606](https://github.com/Agoric/agoric-sdk/commit/3cb46063080dd4fac27507ad0062e54dbf82eda4))
* add OTEL (OpenTelemetry) histograms ([f526ff4](https://github.com/Agoric/agoric-sdk/commit/f526ff4c787129d0fe99e1f82fd9f75bd27afb27))
* allow $NO_FAKE_CURRENCIES=1 to eliminate default purses ([0a2d054](https://github.com/Agoric/agoric-sdk/commit/0a2d05496dd2de6e582f0df5729ffacd5ce80406))
* export SwingSet metrics to Prometheus via local HTTP port ([78160fe](https://github.com/Agoric/agoric-sdk/commit/78160fe0de20b8032bbdb988a882d8dcf10f9150))
* wire metrics into fake-chain too ([003c34c](https://github.com/Agoric/agoric-sdk/commit/003c34caa9832c8171675dfbb466127ca14b360e))





# [0.24.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.23.0...@agoric/cosmic-swingset@0.24.0) (2020-12-10)


### Bug Fixes

* add interfaces and codec ([57db476](https://github.com/Agoric/agoric-sdk/commit/57db476926d53c4ae40dbd7f4ec2e1a71d4761a9))
* minor fixes while debugging purse notifiers ([bc4992a](https://github.com/Agoric/agoric-sdk/commit/bc4992ac65bba9007d44d242d6f0144072bf717b))
* more support for hacktheorb ([b58e5cd](https://github.com/Agoric/agoric-sdk/commit/b58e5cd1c8b16467565967edbe4140a0749274d7))
* only run the kernel at the end of each block ([a11fd5b](https://github.com/Agoric/agoric-sdk/commit/a11fd5b5c98e197d04967a34568db1a782926c1b))
* properly forward tokens to REPL ([647b999](https://github.com/Agoric/agoric-sdk/commit/647b9990a281cd086de0dc37ccb9ce04d81c3c34))
* update Docker build steps ([7c7379d](https://github.com/Agoric/agoric-sdk/commit/7c7379db95f9b09151ad17533c9fa0c5c864c54c))
* update paths and make rules ([f9982a3](https://github.com/Agoric/agoric-sdk/commit/f9982a39deb4ba1b94b83dc0decf0ce8d9a575e9))
* update to IBC relayer v1.0.0-rc1 ([bea1021](https://github.com/Agoric/agoric-sdk/commit/bea10217f1647a31cb2771a620d749725163cbe7))
* upgrade the proto definitions ([30c7b70](https://github.com/Agoric/agoric-sdk/commit/30c7b70532f5a379d1b8ca45e11cbf80cfe3e1e5))
* upgrade to Cosmos-SDK v0.40.0-rc3 ([ad82894](https://github.com/Agoric/agoric-sdk/commit/ad82894016c851ba5b5f65509f06abea679dbd89))


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* stash the accessToken in localStorage ([a8ce36c](https://github.com/Agoric/agoric-sdk/commit/a8ce36c7ef3ffe94b07629f2108206c6187dc675))





# [0.23.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.22.1-dev.0...@agoric/cosmic-swingset@0.23.0) (2020-11-07)


### Bug Fixes

* allow priceRegistry to force-override an entry ([dceafd6](https://github.com/Agoric/agoric-sdk/commit/dceafd6073b8ba6d43acbefafec68797eb365729))
* count the outbound dataful trips to a given target ([e0b5040](https://github.com/Agoric/agoric-sdk/commit/e0b5040eaed659dc3debd4136a13947f5a26776b))
* don't create duplicate central price authority ([a7ec3d1](https://github.com/Agoric/agoric-sdk/commit/a7ec3d1f775c764fe09cf45fb67130f24d3a35cf))
* don't ever display a 404 for the wallet ([4fb3d48](https://github.com/Agoric/agoric-sdk/commit/4fb3d480530059f58fb4559744384d5f3c1c8adf))
* excise `conventionalDecimalPlaces` for now ([0e7c896](https://github.com/Agoric/agoric-sdk/commit/0e7c896ed0ea261aa76b07f3d9c5df640c42699e))
* rename solo back to client ([3b77445](https://github.com/Agoric/agoric-sdk/commit/3b77445de8ac355a7f494beb96964fe2b9dbd8ab))


### Features

* add `agoric.priceAuthority` via priceAuthorityRegistry ([c602d14](https://github.com/Agoric/agoric-sdk/commit/c602d1446e7b6b37016fafd1e013da2c28cacc76))
* add Testnet.$USD and Testnet.$LINK ([eac7af9](https://github.com/Agoric/agoric-sdk/commit/eac7af9b3cb6662503e8fc20acd2932cdc8dfbc8))
* allow network-config.gci to specify a URL to genesis ([d15a26e](https://github.com/Agoric/agoric-sdk/commit/d15a26e759899f286d2ee0045ab93926d7fc337f))
* convert the fakePriceAuthority to a PlayerPiano model ([#1985](https://github.com/Agoric/agoric-sdk/issues/1985)) ([cd7ebd8](https://github.com/Agoric/agoric-sdk/commit/cd7ebd86b1f37655b9213786ab6828dd6c7c098a))
* simple volatile priceAuthority ([af76585](https://github.com/Agoric/agoric-sdk/commit/af7658576f00b6ebaae3bd91aebc6d9fc983fa71))





## [0.22.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.22.0...@agoric/cosmic-swingset@0.22.1-dev.0) (2020-10-19)


### Bug Fixes

* **ag-solo:** remove stale call to ackWallet ([148957a](https://github.com/Agoric/agoric-sdk/commit/148957a722d4c935025eab8a5e3481ab42d43736))





# [0.22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.21.1-dev.2...@agoric/cosmic-swingset@0.22.0) (2020-10-11)


### Bug Fixes

* add getBootstrap method to handler object ([bb1f525](https://github.com/Agoric/agoric-sdk/commit/bb1f5256bd6ab49c83cb46aee9e3a6557293f5b6))
* allow for genesis.initial_height > 1 ([c37fe33](https://github.com/Agoric/agoric-sdk/commit/c37fe33865a5c6e83b7ea3ca3d7e12cb84b8d50e))
* disable state-sync by default, until we've implemented it ([fedb533](https://github.com/Agoric/agoric-sdk/commit/fedb533ee3e6a989131b1c1a8992072b562d4fa9))
* enable external `agoric open` when running under Docker ([57446a5](https://github.com/Agoric/agoric-sdk/commit/57446a5ae3187cd32984c797bf3e69dd2ef88d3d))
* get deployment to work ([77d2c6b](https://github.com/Agoric/agoric-sdk/commit/77d2c6b47bc18a503b46949e59fc0fe6d5a14225))
* make ag-cosmos-helper's home $HOME/.ag-cosmos-helper again ([1b9ad64](https://github.com/Agoric/agoric-sdk/commit/1b9ad647916d2c8de11b5f884bb88613e95ddcaa))
* minor fixes for bootstrap and web server ([0829061](https://github.com/Agoric/agoric-sdk/commit/08290617dccb94b565657717cdc022ce462aa237))
* remove obsolete `--home-client` ([f97171a](https://github.com/Agoric/agoric-sdk/commit/f97171a001842e2777cf4e437d1ec8cf086ca1b9))
* update @agoric/store types and imports ([9e3493a](https://github.com/Agoric/agoric-sdk/commit/9e3493ad4d8c0a6a9230ad6a4c22a3254a867115))
* upgrade to latest cosmos-sdk ([876d2c8](https://github.com/Agoric/agoric-sdk/commit/876d2c8318521972a4f600f1307b1b47b6b338f7))
* upgrade to our --keyring-dir PR (temporarily) ([38e170d](https://github.com/Agoric/agoric-sdk/commit/38e170d42c2af74a565749d040f365905cd0d3fc))
* use `gentx --client-home=...` to initialise genesis validators ([54c5a2f](https://github.com/Agoric/agoric-sdk/commit/54c5a2f2e23f7f9df254b35f2657e449d9fb847a))
* use gentx --home-client flag ([5595b41](https://github.com/Agoric/agoric-sdk/commit/5595b410377116b7a2d20d39a46ec87d2b5ea01f))
* use gentx --home-server instead of --home-client ([ed634bf](https://github.com/Agoric/agoric-sdk/commit/ed634bfbe976ca48a203b4f44b3eb0d62e1edd82))
* use the correct --home for sending provision-one ([98f03d6](https://github.com/Agoric/agoric-sdk/commit/98f03d659fb252c4164bde0d3c84eac7dbbe1669))
* **cosmic-swingset:** make REPL history numbers more robust ([ed7729a](https://github.com/Agoric/agoric-sdk/commit/ed7729a41226af3ceb99474dcde3015487218927))


### Features

* allow CapTP URL handlers ([b3e1e61](https://github.com/Agoric/agoric-sdk/commit/b3e1e61b2a2dee7bd203bcffa23b2d1d5d1409bd))
* cleanups and fixes to the wallet ([db525f8](https://github.com/Agoric/agoric-sdk/commit/db525f85a72c578bffcd055c151743fa8176dcd2))
* implement slip44 HD path coin type ([ed9743a](https://github.com/Agoric/agoric-sdk/commit/ed9743a84ba16dd669a9235ba0ba9d2db76e4e35))
* overhaul kernel initialization and startup ([23c3f9d](https://github.com/Agoric/agoric-sdk/commit/23c3f9df56940230e21a16b4861f40197192fdea))
* pass through URL search params via wallet-bridge.html ([643636e](https://github.com/Agoric/agoric-sdk/commit/643636e3a0de564b4574a134368963a569252a96))





## [0.21.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.21.1-dev.1...@agoric/cosmic-swingset@0.21.1-dev.2) (2020-09-18)


### Bug Fixes

* **cosmic-swingset:** remove monorepo Go dependency ([052518e](https://github.com/Agoric/agoric-sdk/commit/052518eef787f28bcf29c025bb1e25dd9c411fee))





## [0.21.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.21.1-dev.0...@agoric/cosmic-swingset@0.21.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/cosmic-swingset





## [0.21.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.21.0...@agoric/cosmic-swingset@0.21.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.20.1...@agoric/cosmic-swingset@0.21.0) (2020-09-16)


### Bug Fixes

* add TODO unimplemented for liveSlots synthetic presences ([6089e71](https://github.com/Agoric/agoric-sdk/commit/6089e71aaa48867625c19d2f64c6e5b29880b7ad))
* change webkey -> accessToken and polish usage ([0362abe](https://github.com/Agoric/agoric-sdk/commit/0362abe1f6aa1322d50826e77c052881d940f72e))
* drastically simplify the new-block listener ([2b3160f](https://github.com/Agoric/agoric-sdk/commit/2b3160fb9efe35e63749ef6cc8d616c37beb01b3))
* excise half-fast Vagrant support ([9bbab1c](https://github.com/Agoric/agoric-sdk/commit/9bbab1c204a0c44bad2e51bcd0f7d08ad02b5a5b))
* have accessToken use a database in ~/.agoric, not network ([bc9cf83](https://github.com/Agoric/agoric-sdk/commit/bc9cf83273b01b76006d69e4ea47b9efbee358dd))
* implement epochs and make tolerant of restarts ([1c786b8](https://github.com/Agoric/agoric-sdk/commit/1c786b861a445891d09df2f1a47d689d641a0c5f))
* implement robust plugin persistence model ([2de552e](https://github.com/Agoric/agoric-sdk/commit/2de552ed4a4b25e5fcc641ff5e80afd5af1d167d))
* make generateAccessToken URL-safe by default ([722f811](https://github.com/Agoric/agoric-sdk/commit/722f811001a16d62e69af76de8a889e6eac4a48f))
* need to expose the wallet bridge to the dapp ([e520b8f](https://github.com/Agoric/agoric-sdk/commit/e520b8fc2afa6f24447140fa54581f4c25cf08cb))
* pass through the entire marshal stack to the vat ([f93c26b](https://github.com/Agoric/agoric-sdk/commit/f93c26b602766c9d8e3eb15740236cf81b38387f))
* properly detect incorrect transactions ([9f8866b](https://github.com/Agoric/agoric-sdk/commit/9f8866b34f2c2ff214f006953371a447860938dd))
* remove ability for localhost to auto-popup the wallet ([597cb80](https://github.com/Agoric/agoric-sdk/commit/597cb8071f335a3aa5a0bcc17d7ff88c1ccc4e07))
* restoring most state, just need to isolate the plugin captp ([f92ee73](https://github.com/Agoric/agoric-sdk/commit/f92ee731afa69435b10b94cf4a483f25bed7a668))
* restrict plugins to be loaded only from ./plugins ([2ba608e](https://github.com/Agoric/agoric-sdk/commit/2ba608e46c6d8d33bdfca03a32af09f9cde3cc34))
* robust .innerHTML protection as per OWASP ([0e54b30](https://github.com/Agoric/agoric-sdk/commit/0e54b30f44bedf55c809fafb17a0cbf05c598636))
* SECURITY: ensure that HTML tags in the REPL are defanged ([b9bd5eb](https://github.com/Agoric/agoric-sdk/commit/b9bd5ebc1a8071326fc206062e089212236430fc))
* SECURITY: use a private on-disk webkey for trusted auth ([f769d95](https://github.com/Agoric/agoric-sdk/commit/f769d95031f8e0b2003d31f0554dce17d6440f1b))
* unique() was LGPL; remove it in favour of a freer alternative ([b2a5319](https://github.com/Agoric/agoric-sdk/commit/b2a53199f238d7f9049bfb31dbb4f9b2f1d433fe))
* upgrade to polycrc that supports safe integers ([b7674c6](https://github.com/Agoric/agoric-sdk/commit/b7674c64a4bdd321bb6fa96f9485161fc3315309))


### Features

* add a simple CRC-6 to board ids to prevent dangerous typos ([85ea976](https://github.com/Agoric/agoric-sdk/commit/85ea9760d652727ef6780efa7529e7f6f7f20b76))
* add local.plugin~.getPluginDir() ([94e7016](https://github.com/Agoric/agoric-sdk/commit/94e70164c1be5f68aaadfcf75223c441cde9f876))
* agoric deploy --allow-unsafe-plugins ([d2a545e](https://github.com/Agoric/agoric-sdk/commit/d2a545ed73b4403f9d85d5ff89637e2470ecdb29))
* be resilient to losing a connection to the chain ([db4274f](https://github.com/Agoric/agoric-sdk/commit/db4274fc8d2670d9191d4373e97bae3380ddc327))
* implement CapTP forwarding over a plugin device ([b4a1be8](https://github.com/Agoric/agoric-sdk/commit/b4a1be8f600d60191570a3bbf42bc4c82af47b06))
* provide a button to activate the wallet from the bridge ([18f1cb2](https://github.com/Agoric/agoric-sdk/commit/18f1cb2793f9a3db25fcab09882fb6421e2e364b))





## [0.20.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.20.0...@agoric/cosmic-swingset@0.20.1) (2020-08-31)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.19.0...@agoric/cosmic-swingset@0.20.0) (2020-08-31)


### Bug Fixes

* add "TODO unimplemented"s ([#1580](https://github.com/Agoric/agoric-sdk/issues/1580)) ([7795f93](https://github.com/Agoric/agoric-sdk/commit/7795f9302843a2c94d4a2f42cb22affe1e91d41d))
* **ag-nchainz:** provision solos with agoric.vattp capability ([e9fc9ed](https://github.com/Agoric/agoric-sdk/commit/e9fc9edad2bd4747ca1f7afd42231663cf20fe21))
* actually test cosmic-swingset files in parallel ([e936999](https://github.com/Agoric/agoric-sdk/commit/e93699913772084247cc3ce475ffd47f810a96e1))
* add `local.comms` object as well ([cf5566f](https://github.com/Agoric/agoric-sdk/commit/cf5566f2e6f7848c3ca1d4034394dcc83074d02b))
* add a version check assertion to enforce Golang 1.14+ ([433d1ce](https://github.com/Agoric/agoric-sdk/commit/433d1ce78d92d5d89beb460075a85acaa6455fa5))
* add local.vattp to localBundle ([a26165a](https://github.com/Agoric/agoric-sdk/commit/a26165aee025d302bc2c9a430917fa5a4bd0fb8b))
* change the default wallet to dapp-svelte-wallet ([6722f23](https://github.com/Agoric/agoric-sdk/commit/6722f2384d4cfe65a0fc8a79ae0a03e1fbcb62e8))
* clean up E.when and E.resolve ([#1561](https://github.com/Agoric/agoric-sdk/issues/1561)) ([634046c](https://github.com/Agoric/agoric-sdk/commit/634046c0fc541fc1db258105a75c7313b5668aa0))
* clear up and solve the races around ag-solo initialisation ([f6482ac](https://github.com/Agoric/agoric-sdk/commit/f6482ac7f5f01cc4c7626610e81c191fd939c69a))
* commit kernel state in END_BLOCK, for reset robustness ([96d4912](https://github.com/Agoric/agoric-sdk/commit/96d491255baa1bbaf17716e54f68947c13a50ad4))
* correct and simplify the bootstrap process ([cb95764](https://github.com/Agoric/agoric-sdk/commit/cb9576453bec3b375c75abea055a09066e719dd7))
* ensure all presences are resolved before creating bundle ([c66e58c](https://github.com/Agoric/agoric-sdk/commit/c66e58c948236eccac9cc3ecdaf1777e9c6464d4))
* force `--pruning=nothing` until we upgrade to Stargate ([9a3d54b](https://github.com/Agoric/agoric-sdk/commit/9a3d54bac54a92babe6fa1610c2a8c88f85a1e6a))
* get fake-chain working again, also with async commit ([8b30196](https://github.com/Agoric/agoric-sdk/commit/8b30196f54f6a608c4c0e3e4587e3500e4e67ffd))
* get git-revision.txt when out of tree ([3275022](https://github.com/Agoric/agoric-sdk/commit/32750224fa7009e8090d9e505225f477c777edaa))
* improve wallet contents migration, but still not great ([650f4f5](https://github.com/Agoric/agoric-sdk/commit/650f4f584b8d724260479e003da92033b626d863))
* make local.vattp and agoric.vattp symmetrical ([9b366d0](https://github.com/Agoric/agoric-sdk/commit/9b366d02667404fca7fa88ee1c70f0e27b9fd209))
* make scenario2 Makefile rules work again ([3c2647a](https://github.com/Agoric/agoric-sdk/commit/3c2647aa5a22c785600f9dbef7a328841ba37607))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* persist the savedChainSends for better recovery ([d8f0eb6](https://github.com/Agoric/agoric-sdk/commit/d8f0eb6b900bdac6c8d110c05c1af38b76df462e))
* properly abort all communication when CapTP is disconnected ([c2c0196](https://github.com/Agoric/agoric-sdk/commit/c2c0196001c2bc94d14645272b931e39ee38c197))
* Protect ag-solo script from shells with prompt strings ($PS1) ([3d5cbe3](https://github.com/Agoric/agoric-sdk/commit/3d5cbe3ad9ea9d3829b5d4de7691bef50c544ea2))
* quieter CapTP disconnections on the ag-solo side ([6bfe9d6](https://github.com/Agoric/agoric-sdk/commit/6bfe9d64be3cd56a69191e2f22769109162fe50a))
* rearrange `home` into `local` and `agoric` ([44ba391](https://github.com/Agoric/agoric-sdk/commit/44ba391db3551b40f5a45ba68cc4e0b7689a8299))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* remove --pruning=nothing flag, as it's unneeded ([48e1a40](https://github.com/Agoric/agoric-sdk/commit/48e1a40d4a439058d1fb9388f86d8532416a2e45))
* remove $BOOT_ADDRESS support ([3fd1e1d](https://github.com/Agoric/agoric-sdk/commit/3fd1e1de35a471287432737e5f16763d4d35040e))
* remove dynamic role from sim-chain ([1a3dd57](https://github.com/Agoric/agoric-sdk/commit/1a3dd57415c452f9527d9ccfe2c2f81429fd3e23))
* remove more BOOTSTRAP_ADDRESS references ([f2141b6](https://github.com/Agoric/agoric-sdk/commit/f2141b68fe8f239e575e4a4dc7e6be70b1ffc7f0))
* remove more controller references ([c9af5a1](https://github.com/Agoric/agoric-sdk/commit/c9af5a11ac5ffa1afcbc47c6399f35945055e3b2))
* remove obsolete bundle command ([e87fecc](https://github.com/Agoric/agoric-sdk/commit/e87fecc1431c8c13bd26b9dbb678bcd29615fafd))
* remove one layer of caching (the mailbox state) ([50b1d7e](https://github.com/Agoric/agoric-sdk/commit/50b1d7e65375c137c8d70093a3f115955d10dec7))
* remove remaining set-json.js instances ([987426f](https://github.com/Agoric/agoric-sdk/commit/987426f98fc4da01e32034df3f962c731fa0f6bb))
* remove unnecessary types ([e242143](https://github.com/Agoric/agoric-sdk/commit/e24214342062f908ebee91a775c0427abc21e263))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* silence more debug messages ([e5ffb67](https://github.com/Agoric/agoric-sdk/commit/e5ffb6786126cad7a20b85039ffdbab1fc6c9d11))
* since we don't simulate, make sure our gas estimate is good ([a0a2df5](https://github.com/Agoric/agoric-sdk/commit/a0a2df5e614bc64a2ceddb4f988ba52dc611ffad))
* upgrade Docker images to Debian buster ([1016cc5](https://github.com/Agoric/agoric-sdk/commit/1016cc5fa27624d2265398d8900f2d4847c9864f))
* use and export x/swingset/storage for all on-chain storage ([c6bf0e2](https://github.com/Agoric/agoric-sdk/commit/c6bf0e26cdcc4ecd78ba2bdbe7a29463d52da36a))
* **ag-nchainz:** give solo vats the `agoric.vattp` power ([a58bbba](https://github.com/Agoric/agoric-sdk/commit/a58bbbaaea964dd2423586dde330803fb6176c31))


### Features

* add `ag-setup-solo` compatibility, `ag-solo setup` ([4abe446](https://github.com/Agoric/agoric-sdk/commit/4abe4468a0626c2adfd170459c26c3fe973595a0))
* add a stub for decentralised web (dweb) ([d81b1f2](https://github.com/Agoric/agoric-sdk/commit/d81b1f262f365a994e2d5e29ff0aa027ed7b2841))
* allow dapps to suggest a petname that is forwarded ([1183a19](https://github.com/Agoric/agoric-sdk/commit/1183a19d5887f62af4ac14cded91c3685df65c2d))
* allow dapps to suggest petnames for issuer/brand, instance, installation ([#1308](https://github.com/Agoric/agoric-sdk/issues/1308)) ([0eb378b](https://github.com/Agoric/agoric-sdk/commit/0eb378bdd70fe008e535e818148a915c3f3db34c))
* defer the wallet UI until the start process ([18ee099](https://github.com/Agoric/agoric-sdk/commit/18ee0990836280478917265bbab966dee15e3dfe))
* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)
* implement wallet upgrade, though not for dapp-react-wallet ([8945ebb](https://github.com/Agoric/agoric-sdk/commit/8945ebb695d42f5124495275d3412b721f1cfc07))
* make production Zoe use prebundled zcf ([138ddd7](https://github.com/Agoric/agoric-sdk/commit/138ddd70cba6e1b11a4a8c0d59f15a018f8bb0e6))
* make Zoe in cosmic-swingset work with prebundled zcf ([2859650](https://github.com/Agoric/agoric-sdk/commit/285965047ba92608b39d9fa496b1bf2b952d748d))
* provision without Python ([1fdc1d3](https://github.com/Agoric/agoric-sdk/commit/1fdc1d31e7684705ebaf337be19271dbcdd9cbdc))
* **vattp:** allow specifying a console object for logging ([ae1a2a0](https://github.com/Agoric/agoric-sdk/commit/ae1a2a03bf2f823b5420b8777ec6c436cbb4b349))
* plumb up the chainID into BEGIN_BLOCK and AG_COSMOS_INIT ([23aa90d](https://github.com/Agoric/agoric-sdk/commit/23aa90d5750a0c3776613febffd8c388f4680861))
* reintroduce anylogger as the console endowment ([98cd5cd](https://github.com/Agoric/agoric-sdk/commit/98cd5cd5c59e9121169bb8104b70c63ccc7f5f01))
* separate wallet implementation from ag-solo ([0bf7eab](https://github.com/Agoric/agoric-sdk/commit/0bf7eab1f575a8805e3908f38271cd3ce1bff053))
* use debugName to differentiate sim-chain instances ([0efc33f](https://github.com/Agoric/agoric-sdk/commit/0efc33fafbeefeff587f94251dc3052179b17642))
* **cosmic-swingset:** add attenuated vattp to fake chain clients ([e6f6aeb](https://github.com/Agoric/agoric-sdk/commit/e6f6aeb6ed64ccf5608cbe6e26fd429283ab8a2e))
* **cosmic-swingset:** send powerFlags from tx provision-one ([5b68af5](https://github.com/Agoric/agoric-sdk/commit/5b68af594b5c8ea0732eb70aeae8ed5139b7b6cb))





# [0.19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.18.0...@agoric/cosmic-swingset@0.19.0) (2020-06-30)


### Bug Fixes

* add CSS to make REPL wrap correctly ([b156251](https://github.com/Agoric/agoric-sdk/commit/b156251dc79afee566ebcde5701e259a98b93e5b))
* better propagate and report egress query errors ([3489a6e](https://github.com/Agoric/agoric-sdk/commit/3489a6e316ca7a62f2085d5e1a7894bdc586a9bb))
* correct the export process, using a temporary cosmos-sdk patch ([db139c3](https://github.com/Agoric/agoric-sdk/commit/db139c3da77a90ffc383d9f606ef675f284920ee))
* don't ignore duplicate packets ([bafac19](https://github.com/Agoric/agoric-sdk/commit/bafac19b73e4c385bfa7be3adeabe0a4a037c0b9))
* don't simulate transactions since we don't use gas ([3f92256](https://github.com/Agoric/agoric-sdk/commit/3f92256dbd8a505f05ae262391a64dd76005580a))
* much clearer IBC implementation ([d3ee754](https://github.com/Agoric/agoric-sdk/commit/d3ee75442d68daa019af184356ec81ed7804f78b))
* print circularity when it really is ([96b07d6](https://github.com/Agoric/agoric-sdk/commit/96b07d6484b1537d28e5e85f3348ebaf47873354))
* remove controller-based provisioning in favour of tx ([023b0be](https://github.com/Agoric/agoric-sdk/commit/023b0be69c6805a6c85c7d1b199dac927448120e))
* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))
* systematically use bin/ag-chain-cosmos ([527ae65](https://github.com/Agoric/agoric-sdk/commit/527ae655acc95ccf9fd2968e551adbe6d2453113))
* use provisionpass for the bootstrap address ([b0c2b73](https://github.com/Agoric/agoric-sdk/commit/b0c2b73ec6ee5d0dda2d3a04c2b251a7ff0e0331))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))
* add agoric start local-chain ([b2238aa](https://github.com/Agoric/agoric-sdk/commit/b2238aab3121e373ff31c2ef1d04a9597ac80bec))
* do not require accounts to exist before provisioning ([043dbcd](https://github.com/Agoric/agoric-sdk/commit/043dbcd745b799391f60be832cb1173ed9aea062))
* enable ag-chain-cosmos Node.js debugging ([5779d6e](https://github.com/Agoric/agoric-sdk/commit/5779d6ecc507b9b01ce779d8db6efc0e2c9dd453))
* further along the path of state export and migration ([13dc588](https://github.com/Agoric/agoric-sdk/commit/13dc588ee3502df243e5e8038406b737df21ccd8))
* **cosmic-swingset:** add board, use board in mailboxAdmin ([#1167](https://github.com/Agoric/agoric-sdk/issues/1167)) ([1381ba6](https://github.com/Agoric/agoric-sdk/commit/1381ba6e1c65a9eb927fb097a058b56e23839b83))
* add new transaction to provision a single address ([d75c867](https://github.com/Agoric/agoric-sdk/commit/d75c8675e3970d6b3bfa1cb048e648f290277d25))
* inbound network connection metadata negotiation ([a7ecd9d](https://github.com/Agoric/agoric-sdk/commit/a7ecd9d9a60ba2769b6865fb6c195b569245a260))
* just enough mechanism to support the provisioning transaction ([889a5db](https://github.com/Agoric/agoric-sdk/commit/889a5db37e61b1d654676abc248db58cf1266425))
* pass blockHeight and blockTime from all IBC events ([79bd316](https://github.com/Agoric/agoric-sdk/commit/79bd3160a3af232b183bcefb8b229fdbf6192c49))
* pass local and remote address to onOpen callback ([2297a08](https://github.com/Agoric/agoric-sdk/commit/2297a089a0fc576a4d958427292b2f174215ad3f))





# [0.18.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.17.0...@agoric/cosmic-swingset@0.18.0) (2020-05-17)


### Bug Fixes

* bump dependency on newer cosmos-sdk ([d114c5e](https://github.com/Agoric/agoric-sdk/commit/d114c5e53be4056df89fd7a15bbd80b3a51fe4c1))
* don't bypass the block queue when running simulateBlock ([444067d](https://github.com/Agoric/agoric-sdk/commit/444067d24f2aee15eece92a0b1a4888b9fb9e419))


### Features

* marshal based on user's petnames ([#1092](https://github.com/Agoric/agoric-sdk/issues/1092)) ([5e1945c](https://github.com/Agoric/agoric-sdk/commit/5e1945c99d405c2dbf1a6c980591c09d8a952e8a))
* provide scaffolding for testing scenario3's home objects ([84752e2](https://github.com/Agoric/agoric-sdk/commit/84752e230f22d8cc254413e3827a24140318dfcb))





# [0.17.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.16.0...@agoric/cosmic-swingset@0.17.0) (2020-05-10)


### Bug Fixes

* always send non-empty acknowledgements ([5e22a4a](https://github.com/Agoric/agoric-sdk/commit/5e22a4a78db9004351f53d6cb5bfdd29f9ee25b6))
* fail hard if there is no $BOOT_ADDRESS ([eeb2592](https://github.com/Agoric/agoric-sdk/commit/eeb25920557974bccc05978ab81966e8cc2a460e))
* fix typo in idToComplete ([#1050](https://github.com/Agoric/agoric-sdk/issues/1050)) ([605e00e](https://github.com/Agoric/agoric-sdk/commit/605e00efd089218d6e2b9bacca352c0e933a8bd8))
* full traversal of sendPacket from end-to-end ([5c76981](https://github.com/Agoric/agoric-sdk/commit/5c76981aa02bf1cd1dcec174bff4a7f95638d500))


### Features

* ag-nchainz start-relayer now starts a single-channel relay ([6946dfb](https://github.com/Agoric/agoric-sdk/commit/6946dfbcae3023675ecffcc22fca2d866a745134))
* Optionally suppress wallet ([ceae9e6](https://github.com/Agoric/agoric-sdk/commit/ceae9e65cf4ece932d1f565c74afeec06c9074cb))





# [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.15.0...@agoric/cosmic-swingset@0.16.0) (2020-05-04)


### Bug Fixes

* add registrar to homeP and fix hanging issue. ([#952](https://github.com/Agoric/agoric-sdk/issues/952)) ([7ca77f3](https://github.com/Agoric/agoric-sdk/commit/7ca77f3d53070d049950348735159e25294e1da9))
* allow wallet bridge from non-localhost origins ([ff545ba](https://github.com/Agoric/agoric-sdk/commit/ff545ba33693f0ba7eb21b136f51d9a00e24b02a))
* check-lmdb: guard against the set() failing too ([4bc045a](https://github.com/Agoric/agoric-sdk/commit/4bc045a4d39daaa4e7094029fa0acd7bf0b41db6))
* correct building Go under docker ([b01614b](https://github.com/Agoric/agoric-sdk/commit/b01614b9aefc8eb66709397ae5f15ae1965454d1))
* cosmic-swingset CI works again ([168ad2c](https://github.com/Agoric/agoric-sdk/commit/168ad2cd8d4945ca76f1979634958ab5924ec108))
* cosmic-swingset: fall back to SimpleStore if LMDB doesn't work ([2e1415a](https://github.com/Agoric/agoric-sdk/commit/2e1415af20c199284e2b6c66c3534869900eb5d9)), closes [#950](https://github.com/Agoric/agoric-sdk/issues/950)
* crisper rejection of closed and revoked ports/connections ([589702b](https://github.com/Agoric/agoric-sdk/commit/589702bb049eed808029546fd0f0eb0b1a19864b))
* decrease the need for sendPacket delay (almost fixed) ([9f65899](https://github.com/Agoric/agoric-sdk/commit/9f658991eb38009ada8d1a6127ad1d6f323d326e))
* disable IBC access from vats, as it can crash the chain ([85c0b86](https://github.com/Agoric/agoric-sdk/commit/85c0b86d64c20bcf96687b4d7360bfdc9c198791))
* get the cosmos-sdk events flowing for sending packets ([4867af4](https://github.com/Agoric/agoric-sdk/commit/4867af4de0d42a1691168d330da7c9d73681f9bc))
* get the encouragement dIBC working ([6bb1337](https://github.com/Agoric/agoric-sdk/commit/6bb13377c94e25df79481a42c3f280b7f4da43ed))
* get working with latest relayer ([3d39496](https://github.com/Agoric/agoric-sdk/commit/3d394963ce16556a639bf6f4118c5e91377b6bcc))
* harmonise the docs with the implementation ([88d2a0a](https://github.com/Agoric/agoric-sdk/commit/88d2a0aeb5cb6ebbece7bebc090b1b6697fdb8e1))
* ibcports->ibcport ([efb9d95](https://github.com/Agoric/agoric-sdk/commit/efb9d95c8fc5b69e76e9dc52236ebea2f98ee50c))
* import the x/swingset keeper, not the ibc/tranfer keeper ([319e15e](https://github.com/Agoric/agoric-sdk/commit/319e15e1935e7f6b286cc3e0ba3026139d2aabdf))
* improve handling of orders that are consummated immediately ([61e4b67](https://github.com/Agoric/agoric-sdk/commit/61e4b673014b81d8336d64059eb9a1ea46629eae)), closes [#13](https://github.com/Agoric/agoric-sdk/issues/13)
* insert agoric-sdk/packages in the package names ([df9d663](https://github.com/Agoric/agoric-sdk/commit/df9d66310a5e9d14b6823ccb6e616490ab2700fc))
* introduce sleep to help mitigate a relayer race condition ([c0014d3](https://github.com/Agoric/agoric-sdk/commit/c0014d3108f28c01d507da1c7553295a3fde6b06))
* lots and lots of improvements ([8f1c312](https://github.com/Agoric/agoric-sdk/commit/8f1c3128bbb4c3baf7f15b9ca632fc902acd238f))
* minor cleanups ([8b63024](https://github.com/Agoric/agoric-sdk/commit/8b63024a0c749c3c61c3daee3695f4546d8079ff))
* missed a change in refactoring ([567f713](https://github.com/Agoric/agoric-sdk/commit/567f71318d5c3bdbf7a6ed620610790dd7cd3c22))
* more dIBC inbound work ([6653937](https://github.com/Agoric/agoric-sdk/commit/665393779540c580d57f798aa01c62855e7b5278))
* more little wallet bridge tweaks ([7fa8c79](https://github.com/Agoric/agoric-sdk/commit/7fa8c7969bb2e8fffd661e28e227c37de031b32f))
* propagate flushChainSend argument from fake-chain to launch ([69ee801](https://github.com/Agoric/agoric-sdk/commit/69ee8019eeda3f6ede4737d90e2abbbff8d5203a))
* propagate Go errors all the way to the caller ([ea5ba38](https://github.com/Agoric/agoric-sdk/commit/ea5ba381e4e510bb9c9053bfb681e778f782a801))
* proper inbound IBC listening ([3988235](https://github.com/Agoric/agoric-sdk/commit/3988235312806711c1837f80788ddc42ae7713dd))
* reimplement crossover connections ([bf3bd2a](https://github.com/Agoric/agoric-sdk/commit/bf3bd2ad78440dad42935e4a30b50de56a77ceba))
* remove hack to delay packets with a timer; the relayer wins! ([a16a444](https://github.com/Agoric/agoric-sdk/commit/a16a444fd1f801b578cc0251da882898b1071355))
* remove unnecessary files ([a13e937](https://github.com/Agoric/agoric-sdk/commit/a13e9375bccd6ff03e814745ca489fead21956f8))
* repl didn't display resolutions to presences ([79a0aa3](https://github.com/Agoric/agoric-sdk/commit/79a0aa314c281f26bf9368c06fbd0cec63167ed3))
* return packet acknowledgements ([4cf6f2f](https://github.com/Agoric/agoric-sdk/commit/4cf6f2f210466fa049361f9d7c115a706ec6ff49))
* return the correct crossover side for inbound ([dc285d7](https://github.com/Agoric/agoric-sdk/commit/dc285d7f80197bf88fcc5961fe758d9cb891d7b4))
* update Agoric-specific code to latest cosmos-sdk ([ddd51cd](https://github.com/Agoric/agoric-sdk/commit/ddd51cd09ae45874620abd1315002b6666b14757))
* upgrade Cosmos SDK to fix x/capability nondeterminism ([1870d5e](https://github.com/Agoric/agoric-sdk/commit/1870d5e95966aaa63c6a0078848a8af255373d5f))
* use the downcall's partial Packet as arguments where possible ([3befb25](https://github.com/Agoric/agoric-sdk/commit/3befb25363fb7f7867e67d6d5ce2c1f807a3c9a7))
* **zoe:** Invitation to offer refactored to use upcall ([#853](https://github.com/Agoric/agoric-sdk/issues/853)) ([c142b7a](https://github.com/Agoric/agoric-sdk/commit/c142b7a64e77262927da22bde3af5793a9d39c2a))


### Features

* add Presence, getInterfaceOf, deepCopyData to marshal ([aac1899](https://github.com/Agoric/agoric-sdk/commit/aac1899b6cefc4241af04911a92ffc50fbac3429))
* add the network vat to ag-solo ([d88062c](https://github.com/Agoric/agoric-sdk/commit/d88062c9d35a10afaab82728123ca3d71b7d5189))
* add vat-ibc, wire in bootstrap ([7c7011d](https://github.com/Agoric/agoric-sdk/commit/7c7011d372618b4008a250e2c9b36cabbbc2543c))
* ag-nchainz helper script ([aab056c](https://github.com/Agoric/agoric-sdk/commit/aab056c7b4d54c8f828139c6e2adc9fe9eb86c55))
* begin getting working with loopback peer ([7729e86](https://github.com/Agoric/agoric-sdk/commit/7729e869793196cbc2f937260c0a320665056784))
* begin working out merging Gaia with Agoric/SwingSet ([7895304](https://github.com/Agoric/agoric-sdk/commit/789530450cb0d913a1ffcf6f836773c840870f26))
* connect notifier to wallet for SimpleExchange ([6d270f8](https://github.com/Agoric/agoric-sdk/commit/6d270f87a1788ad08526f929fc8165eaf7a61e3b))
* end-to-end dIBC across chains ([151ff3f](https://github.com/Agoric/agoric-sdk/commit/151ff3f9e0c92972aa7a21a6f55c1898db85b820))
* get 'ibc/*/ordered/echo' handler working ([2795c21](https://github.com/Agoric/agoric-sdk/commit/2795c214cae8ac44eb5d19eb1b1aa0c066a22ecd))
* implement `console` endowment for the REPL ([4aaf56d](https://github.com/Agoric/agoric-sdk/commit/4aaf56d883faf661d54862bd46357a8b89ad668f))
* implement the "sendPacket" transaction ([063c5b5](https://github.com/Agoric/agoric-sdk/commit/063c5b5c266187bc327dde568090dabf2bbfde8d))
* implement the network vat ([0fcd783](https://github.com/Agoric/agoric-sdk/commit/0fcd783576ecfab5430d3d905a53f22b3e01e95f))
* introduce vats/ibc.js handler ([cb511e7](https://github.com/Agoric/agoric-sdk/commit/cb511e74e797bedbcce1aac4193780ae7abc8cfc))
* rename the registrar to be registry in "home" ([7603edb](https://github.com/Agoric/agoric-sdk/commit/7603edb8abed8573282337a66f6af506e8715f8c))
* store offerhandle and id, get offerHandle with id ([#966](https://github.com/Agoric/agoric-sdk/issues/966)) ([ebd3426](https://github.com/Agoric/agoric-sdk/commit/ebd3426cdbbf17ffd00c02c5a9d38036c97fd4b9))
* suspend an outbound connection until the relayer picks it up ([ee22926](https://github.com/Agoric/agoric-sdk/commit/ee22926e52c3b4d17df7fa760e017d02f03f1a8f))
* symlink wallet from agoric-sdk or NPM for all ag-solos ([fdade37](https://github.com/Agoric/agoric-sdk/commit/fdade3773ae270d1ecbcf79f05d8b58c580e2350))
* use wallet from NPM if the SDK one is not built ([182643b](https://github.com/Agoric/agoric-sdk/commit/182643b15c0ca4ff5ace0fc260fb955b4d2d9d17))
* **swingset:** Draft protocol for Go to JS bridge ([#943](https://github.com/Agoric/agoric-sdk/issues/943)) ([c7035c1](https://github.com/Agoric/agoric-sdk/commit/c7035c1238ce0fb92337826550c26f2c0eea8c6e))





# [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.15.0-alpha.0...@agoric/cosmic-swingset@0.15.0) (2020-04-13)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.15.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.1...@agoric/cosmic-swingset@0.15.0-alpha.0) (2020-04-12)


### Bug Fixes

* better detection of already-listening ports ([6194c31](https://github.com/Agoric/agoric-sdk/commit/6194c31a9c7405f017666ac6de29b054b3e87c9d))
* change the account prefix to "agoric" and app name to Agoric ([0c14de9](https://github.com/Agoric/agoric-sdk/commit/0c14de900c008afb8a09eeeddaff6547be7096d2))
* cosmic-swingset should use disk-backed storage ([da0613a](https://github.com/Agoric/agoric-sdk/commit/da0613a58fa9711d64584ee1cd7886309cff52fd)), closes [#899](https://github.com/Agoric/agoric-sdk/issues/899)
* tweak log levels ([b0b1649](https://github.com/Agoric/agoric-sdk/commit/b0b1649423f7b950904604ba997ddb25e413fe08))


### Features

* introduce a wrapper around ag-solo to start in inspect mode ([93e4887](https://github.com/Agoric/agoric-sdk/commit/93e488790da490d997c7d707b1340fc7be5b33b7))
* use SETUP_HOME/cosmos-delegates.txt and increase defaults ([5e87ae1](https://github.com/Agoric/agoric-sdk/commit/5e87ae1c501adf5b35371c30dc999bfcea8c75e6))





## [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.0...@agoric/cosmic-swingset@0.14.1) (2020-04-03)


### Bug Fixes

* make provisioning server work again ([c7cf3b3](https://github.com/Agoric/agoric-sdk/commit/c7cf3b3e0d5e0966ce87639ca1aa36546f365e38))





# [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.14.0-alpha.0...@agoric/cosmic-swingset@0.14.0) (2020-04-02)

**Note:** Version bump only for package @agoric/cosmic-swingset





# [0.14.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/cosmic-swingset@0.13.0...@agoric/cosmic-swingset@0.14.0-alpha.0) (2020-04-02)


### Bug Fixes

* add `single-node` subcommand on the Docker entrypoint ([210edb6](https://github.com/Agoric/agoric-sdk/commit/210edb683280791b0e74831860c7e93176dadbed))
* have a generic IBCChannelHandler that takes ChannelTuples ([3bff564](https://github.com/Agoric/agoric-sdk/commit/3bff564a4ffa6f43e4496871b628ea1bfaa4c568))
* properly use EncodedLen ([0633825](https://github.com/Agoric/agoric-sdk/commit/063382581ba472ec5adb0eb5760f501148158010))
* stringify queued objects when sending over WebSocket ([6c45374](https://github.com/Agoric/agoric-sdk/commit/6c453742c773f79dc956a56515a3701152341bc7))
* use the PacketI interface where possible ([48c3bf5](https://github.com/Agoric/agoric-sdk/commit/48c3bf5e80b6fd8d4fec3e73a4a2225eb1ca5ae8))


### Features

* implement the Go side of dynamic IBC ([cf2d894](https://github.com/Agoric/agoric-sdk/commit/cf2d8945eecd8871898c127e9748ea7c5247628e))
* just ack IBC packets and close ([88257f8](https://github.com/Agoric/agoric-sdk/commit/88257f80574e3651cf88b50a2d513139dc7d497f))
* use Agoric version of cosmos-sdk for dynamic IBC ([b004f11](https://github.com/Agoric/agoric-sdk/commit/b004f11f7c50d508c6de9f51ad28a1b1fc266ae0))





# 0.13.0 (2020-03-26)


### Bug Fixes

* accomodate modified offer ids ([38d367d](https://github.com/Agoric/agoric-sdk/commit/38d367dedcba143524b4668573f11b757233401b))
* actually synchronise the inbound messages ([9568483](https://github.com/Agoric/agoric-sdk/commit/95684834643321dcceb70675f450efe42464df7c))
* add END_BLOCK controller call ([b115b55](https://github.com/Agoric/agoric-sdk/commit/b115b559ef7636c7b4ed3f3878d347a2216a4947))
* add missing files and dependencies ([2dc3e07](https://github.com/Agoric/agoric-sdk/commit/2dc3e072103aa68517c0ca31b15e1bf6d4bfc239))
* allow disabling of logging by setting DEBUG='' ([131c1c6](https://github.com/Agoric/agoric-sdk/commit/131c1c64f646f2fa3adece698d1da240dc969f03))
* don't double-withdraw from the first purse of an assay ([b37203e](https://github.com/Agoric/agoric-sdk/commit/b37203eded655169853bb1a3c7acdcdc8634ef15))
* generalise the wallet to arbitrary offers ([4b3ae29](https://github.com/Agoric/agoric-sdk/commit/4b3ae2974b2060e022fbe200b82e986d09cbc09a))
* getOfferDescriptions is now working ([b50690b](https://github.com/Agoric/agoric-sdk/commit/b50690be3294baff6165cb3a10b644f31bb29e15))
* hydrateHooks on the HTTP handler instead of addOffer ([b3e214d](https://github.com/Agoric/agoric-sdk/commit/b3e214d66a9e753da992d1e320350321c78e747a))
* improve command device support ([c70b8a1](https://github.com/Agoric/agoric-sdk/commit/c70b8a10b04c5554b1a952daa584216227858bc5))
* input queuing, and use the block manager for fake-chain ([c1282c9](https://github.com/Agoric/agoric-sdk/commit/c1282c9e644fbea742846f96a80a06afe64664ba))
* introduce and use Store.entries() ([b572d51](https://github.com/Agoric/agoric-sdk/commit/b572d51df45641da59bc013a0f2e45a694e56cbc))
* make default log level for ag-chain-cosmos more compatible ([258e4c9](https://github.com/Agoric/agoric-sdk/commit/258e4c94746888f0392da19335cf7abc804c3b3a))
* make REPL occupy less of screen when below wallet ([d4fc392](https://github.com/Agoric/agoric-sdk/commit/d4fc392f49bd515a70e2cc904f2fca08b0931584))
* make the changes needed to cancel pending offers ([b4caa9e](https://github.com/Agoric/agoric-sdk/commit/b4caa9ed26489ad39651b4717d09bd9f84557480))
* make the fake-chain better ([b4e5b02](https://github.com/Agoric/agoric-sdk/commit/b4e5b02ca8fc5b6df925391f3b0a2d6faecbdb73))
* panic on END_BLOCK error ([28b6d46](https://github.com/Agoric/agoric-sdk/commit/28b6d467ba3a40e752f75467c2381d1afa69a77e))
* polish the wallet and dApp UIs ([292291f](https://github.com/Agoric/agoric-sdk/commit/292291f234646cdb0685dbf63cf0a75a2491018c))
* prevent deadlock in the input queue for delivered commands ([ee0e488](https://github.com/Agoric/agoric-sdk/commit/ee0e4881dc2dd17fea8b4efea6e149bd86daab22))
* prevent simulated blocks from reentering the kernel ([42f7abd](https://github.com/Agoric/agoric-sdk/commit/42f7abd4ec9a017bbca6d02c164c06272e328713)), closes [#763](https://github.com/Agoric/agoric-sdk/issues/763)
* propagate more errors correctly ([0437c5f](https://github.com/Agoric/agoric-sdk/commit/0437c5f1510c05d49a4b5070919db77efefdbb09))
* proper sorting of wallet entries ([24627eb](https://github.com/Agoric/agoric-sdk/commit/24627eb5c271d75052370afa24ead851d001a126))
* properly kill off child processes on SIGHUP ([93b71cd](https://github.com/Agoric/agoric-sdk/commit/93b71cd6b894cbd37dab39b6946ed8e6d47ab2a6))
* remove nondeterminism from ag-solo replay ([2855b34](https://github.com/Agoric/agoric-sdk/commit/2855b34158b71e7ffe0acd7680d2b3c218a5f0ca))
* remove reference to ping ([a9a3f0f](https://github.com/Agoric/agoric-sdk/commit/a9a3f0fd68d9870333fd25c458d8eba151557c65))
* rename connection to channel ([f50a94b](https://github.com/Agoric/agoric-sdk/commit/f50a94b33029e7ebd67db9a1c812f1d2dc955aa9))
* unbreak the fake-chain ([d84ee30](https://github.com/Agoric/agoric-sdk/commit/d84ee30ad2991e0f1676627a23c3e6989d3b0728))
* use COMMIT_BLOCK action to sync state ([5a3c087](https://github.com/Agoric/agoric-sdk/commit/5a3c08705d8477fcc281134e8a3540079fcb1edd))
* use latest @agoric/tendermint ([346b582](https://github.com/Agoric/agoric-sdk/commit/346b58291360b586e02278b14a7860715f0a06e8))
* wait for payments at opportune moments ([53f359d](https://github.com/Agoric/agoric-sdk/commit/53f359d56c49ef62a90e1e834b359de8ca5dfa4f))
* **ag-chain-cosmos:** keep SwingSet state in the validator state dir ([#434](https://github.com/Agoric/agoric-sdk/issues/434)) ([00b874c](https://github.com/Agoric/agoric-sdk/commit/00b874c59ef29db49bec4e89e1ed9122e0a171f7)), closes [#433](https://github.com/Agoric/agoric-sdk/issues/433)
* **ag-cosmos-helper:** properly register /txs route ([17bae2d](https://github.com/Agoric/agoric-sdk/commit/17bae2d1546e14d1555b1e97b9359372ee124ba5))
* **ag-solo:** be more tolerant of missing wallet ([94c2a3e](https://github.com/Agoric/agoric-sdk/commit/94c2a3e38d618202c125f784814858bf06e4d191))
* **ag-solo:** don't require a git checkout to init ([b8c4474](https://github.com/Agoric/agoric-sdk/commit/b8c44748da0e0b9df468c518c8d37c0aa75013d6)), closes [#570](https://github.com/Agoric/agoric-sdk/issues/570) [#562](https://github.com/Agoric/agoric-sdk/issues/562)
* **ag-solo:** reenable the ag-solo bundle command ([6126774](https://github.com/Agoric/agoric-sdk/commit/6126774fd3f102cf575a430dfddb3a0c6adcf0f5)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **agoric-cli:** changes to make `agoric --sdk` basically work again ([#459](https://github.com/Agoric/agoric-sdk/issues/459)) ([1dc046a](https://github.com/Agoric/agoric-sdk/commit/1dc046a02d5e616d33f48954e307692b43008442))
* **bundle:** deprecate the experimental E.C() syntax ([07f46cc](https://github.com/Agoric/agoric-sdk/commit/07f46cc47f726414410126400a7d34141230c967))
* **bundle:** use the same HandledPromise ([e668d3c](https://github.com/Agoric/agoric-sdk/commit/e668d3c9106ef6c47c66319afb8d954094b128eb)), closes [#606](https://github.com/Agoric/agoric-sdk/issues/606)
* **captp:** use new @endo/eventual-send interface ([d1201a1](https://github.com/Agoric/agoric-sdk/commit/d1201a1a1de324ae5e21736057f3bb03f97d2bc7))
* **chain:** properly commit state ([7703aa7](https://github.com/Agoric/agoric-sdk/commit/7703aa753769d89dc1b2c7a899cfcf37c2f3626f))
* **chain:** state is being stored correctly again ([fe0b33d](https://github.com/Agoric/agoric-sdk/commit/fe0b33d2d33b4989f63d1e7030de61b5e886e69f))
* **cli:** improve install, template, fake-chain ([0890171](https://github.com/Agoric/agoric-sdk/commit/08901713bd3db18b52ed1793efca21b459e3713e))
* **cosmic-swingset:** minor UI versioning tweaks ([e0a5985](https://github.com/Agoric/agoric-sdk/commit/e0a59858ce606c31a756a0b029b57b478cfe84a0))
* **cosmic-swingset:** reduce unnecessary logs ([#425](https://github.com/Agoric/agoric-sdk/issues/425)) ([8dc31a0](https://github.com/Agoric/agoric-sdk/commit/8dc31a0d3620372523887adc7ea7c28ef4bf195d)), closes [#424](https://github.com/Agoric/agoric-sdk/issues/424)
* **cosmic-swingset:** reenable setup scripts ([e533479](https://github.com/Agoric/agoric-sdk/commit/e5334791202a89028d31ddf8ea109fe469a84943)), closes [#311](https://github.com/Agoric/agoric-sdk/issues/311)
* **deployment:** update deployment steps ([7527eb0](https://github.com/Agoric/agoric-sdk/commit/7527eb01a3fd5fd4eb4db6f7e9452ccacfe39a74))
* **docker:** cache Go depedency downloads to optimise docker builds ([aba22f0](https://github.com/Agoric/agoric-sdk/commit/aba22f0639ab9d92c02b5a87e30994d353762998))
* **docker:** more updates for ag-setup-solo ([e4b7c86](https://github.com/Agoric/agoric-sdk/commit/e4b7c868858329928c7fb25f4cac881d81458a99))
* **docker:** propagate git-revision correctly ([d8e6f7e](https://github.com/Agoric/agoric-sdk/commit/d8e6f7eca73a9fe6ba5ce4f9a01d38cd768c89d1))
* **docker:** remove dependency on NPM ([d3a8050](https://github.com/Agoric/agoric-sdk/commit/d3a805029da851985ae59836f76f6a4dd794488b))
* **eventual-send:** Update the API throughout agoric-sdk ([97fc1e7](https://github.com/Agoric/agoric-sdk/commit/97fc1e748d8e3955b29baf0e04bfa788d56dad9f))
* **go:** use agoric-labs/tendermint subscription-keep-id ([10b2cd2](https://github.com/Agoric/agoric-sdk/commit/10b2cd26191b1d8982f44a68bbe4f480be3772de))
* **Makefile:** better convention for installing ag-chain-cosmos ([b27426a](https://github.com/Agoric/agoric-sdk/commit/b27426a0b74e9c21482172b71cc30fc36ebf29f5))
* **Makefile:** install ag-chain-cosmos in $GOPATH/bin/ ([d4af74f](https://github.com/Agoric/agoric-sdk/commit/d4af74fbc090383f9e2bdcd564a72f3a6433e164))
* **Makefile:** remove old docker-build and docker-push rules ([92a3816](https://github.com/Agoric/agoric-sdk/commit/92a3816968c17fc68830ff9cc433b02d23e70314))
* **Makefile:** set up the GOPATH environment ([ab72ca5](https://github.com/Agoric/agoric-sdk/commit/ab72ca562e0c5f2f6051a1c3eabebd0e680f3808))
* **provisioner:** allow for mount points as well ([7350220](https://github.com/Agoric/agoric-sdk/commit/7350220dfab2612ad7f3858988220cb307b92726))
* **provisioning-server:** remove debug prints ([f5b0e14](https://github.com/Agoric/agoric-sdk/commit/f5b0e14a96c77fd1bb40fbbf42e4f253b551d0a8))
* **pserver:** clarify StackedResource ([1251669](https://github.com/Agoric/agoric-sdk/commit/125166946d9eb985f6db2d797accbe37b6a90c22))
* **pserver:** new helper arguments and returns ([d40f2ac](https://github.com/Agoric/agoric-sdk/commit/d40f2ac452936ae8996f0e199c2b3f33ebc913c6))
* **solo:** get repl working again ([a42cfec](https://github.com/Agoric/agoric-sdk/commit/a42cfec9c8c087c77ec6e09d5a24edfe0d215c02))
* **test-make:** run the default Makefile target ([aa7d960](https://github.com/Agoric/agoric-sdk/commit/aa7d96039d6e0ca00d24a01756569e1780b375ea))
* rename ustake -> uagstake ([ac89559](https://github.com/Agoric/agoric-sdk/commit/ac895597e57a118948d686a0f60ebf8aed18d64e))
* **pserver:** use with-blocks when possible ([#384](https://github.com/Agoric/agoric-sdk/issues/384)) ([43ac9ac](https://github.com/Agoric/agoric-sdk/commit/43ac9ac087c5c221eca624b4b63c395699e956e9))
* **testnet:** properly push agoric/cosmic-swingset-setup ([d82aad6](https://github.com/Agoric/agoric-sdk/commit/d82aad6fb2ce71826fd71e2404fc1f1722ec709e))
* **ustake:** stake is actually micro-stake ([1aaf14f](https://github.com/Agoric/agoric-sdk/commit/1aaf14f078d1defb09d52692e78dabb9854bbb27))


### Features

* accomodate Zoe roles as is currently designed ([d4319d1](https://github.com/Agoric/agoric-sdk/commit/d4319d173d5ade915b3132f79054926f78121a51))
* add anylogger support ([4af822d](https://github.com/Agoric/agoric-sdk/commit/4af822d0433ac2b0d0fd53298e8dc9c7347a3e11))
* add wallet offer publicID querying API to the bridge ([4010226](https://github.com/Agoric/agoric-sdk/commit/401022662fb8776dc671a46eb5b31dd20d0bf318))
* add wallet.ping() method for testing ([1f07cd2](https://github.com/Agoric/agoric-sdk/commit/1f07cd26d55503af4dc5dbd8d3b916b323033793))
* allow subscribing to wallet offer changes ([5ad56e6](https://github.com/Agoric/agoric-sdk/commit/5ad56e6985b221e65989f4d10b39154c57d8f13c))
* default to silent unles `DEBUG=agoric` ([2cf5cd8](https://github.com/Agoric/agoric-sdk/commit/2cf5cd8ec66d1ee38f351be8b2e3c808afd554a9))
* implement the Cosmos block manager ([3a5936a](https://github.com/Agoric/agoric-sdk/commit/3a5936aeae6fc32a6075d85b7af88885e689a2ab))
* implement wallet bridge separately from wallet user ([41c1278](https://github.com/Agoric/agoric-sdk/commit/41c12789c1fd230fa8442db9e3979d0c7372025a))
* include requestContext in inboundCommand, and use it in wallet ([b332870](https://github.com/Agoric/agoric-sdk/commit/b33287032a376b4adf8c5f695321a559550401ea))
* new multirole (ending with '*') implementation ([442fd20](https://github.com/Agoric/agoric-sdk/commit/442fd202cdd0e361728e1dbb9e0c04ccdfb1e8d4))
* revamp the wallet for brands and Zoe roles ([b4a806c](https://github.com/Agoric/agoric-sdk/commit/b4a806c63a30e7cfca9a4b4c642702935e5741f4))
* separate registerAPIHandler from registerURLHandler ([7c670d9](https://github.com/Agoric/agoric-sdk/commit/7c670d9c5c92f7e229b6895625423702d39d16d2))
* use anylogger ([81a8950](https://github.com/Agoric/agoric-sdk/commit/81a8950c8f4a1e5cae26db463ff1986033e399d5))
* **ag-solo:** integrate wallet UI with REPL ([a193e87](https://github.com/Agoric/agoric-sdk/commit/a193e874ea373f5e6345568479ce620401147db2))
* **cosmic-swingset:** use a fake chain for scenario3 ([#322](https://github.com/Agoric/agoric-sdk/issues/322)) ([f833610](https://github.com/Agoric/agoric-sdk/commit/f833610831e687c65a28a0069dc58e74b18d7321))
* **ibc:** use latest cosmos-sdk/ibc-alpha branch ([153f1b9](https://github.com/Agoric/agoric-sdk/commit/153f1b9d0c1890b7534e749f1e065d5fbdfa3236))
* **reset-state:** add command to ag-solo to reset SwingSet ([233c0ff](https://github.com/Agoric/agoric-sdk/commit/233c0ff5a682c8b25a457e9c71f9d0b08e6c78ac))
* **start:** implement `agoric start testnet` ([cbfb306](https://github.com/Agoric/agoric-sdk/commit/cbfb30604b8c2781e564bb250dd58d08c7d57b3c))
