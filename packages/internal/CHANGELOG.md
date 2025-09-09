# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.4.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.4.0-u22.0...@agoric/internal@0.4.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @agoric/internal

## [0.4.0-u22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.3.2...@agoric/internal@0.4.0-u22.0) (2025-09-08)

### ⚠ BREAKING CHANGES

* **vstorage:** Enforce path validation
* **zone:** use fresh heap and virtual zones

### Features

* Add terminate-governed-instance.js proposal ([c2cb517](https://github.com/Agoric/agoric-sdk/commit/c2cb51779039ef2a5921efcc35b3b365a7b6159f)), closes [#10725](https://github.com/Agoric/agoric-sdk/issues/10725) [#10861](https://github.com/Agoric/agoric-sdk/issues/10861)
* Add the Prometheus slog sender module and load it per OTEL_EXPORTER_PROMETHEUS_PORT ([1dc1827](https://github.com/Agoric/agoric-sdk/commit/1dc182783ce191f0ba2131cb1f7b3042f287737a)), closes [#11045](https://github.com/Agoric/agoric-sdk/issues/11045)
* CapDataShape, StreamCellShape guards ([e60dd49](https://github.com/Agoric/agoric-sdk/commit/e60dd49fc3e9bce6fc9fd1aaf86d9d7cf52017f7))
* checked cast with TypedMatcher ([ed14400](https://github.com/Agoric/agoric-sdk/commit/ed14400ebebf8114694ab2b291afd6d858877165))
* consistent publishTxnRecord (record) ([dbf3934](https://github.com/Agoric/agoric-sdk/commit/dbf39340c75d9e01af2ee9ceccac327660af94a6))
* **cosmic-swingset:** add metrics for each action type ([#10888](https://github.com/Agoric/agoric-sdk/issues/10888)) ([618553b](https://github.com/Agoric/agoric-sdk/commit/618553b8ea0ea736a1406e2c8dae4378315547e9)), closes [#10883](https://github.com/Agoric/agoric-sdk/issues/10883) [#10882](https://github.com/Agoric/agoric-sdk/issues/10882)
* **cosmic-swingset:** implement `ENACTED_UPGRADE` blocking send ([3825c17](https://github.com/Agoric/agoric-sdk/commit/3825c171f3528cd3c4e63e8aeb3363a3e88b75fc))
* defaultSerializer util ([19d5e03](https://github.com/Agoric/agoric-sdk/commit/19d5e03b426e74b8a19d11b425634a0a83e929a1))
* **deploy-script-support:** Write out bundle file names in machine readable file ([68235ec](https://github.com/Agoric/agoric-sdk/commit/68235ec3fc78b9973d886e782e03048427b6f93e))
* documentStorageSchema w FakeStorageKit ([a16e212](https://github.com/Agoric/agoric-sdk/commit/a16e212a35e1956eb6356373ad4cc4c398c4dc91))
* elide comments in package build scripts ([2d410c7](https://github.com/Agoric/agoric-sdk/commit/2d410c7da0514d21170f11bde196ebc694141bda))
* export types ([34c391a](https://github.com/Agoric/agoric-sdk/commit/34c391a49ded28b780f303f0a5c36d5eef8229ac))
* getBridgeId on ScopedBridgeManager ([aec4dea](https://github.com/Agoric/agoric-sdk/commit/aec4dea4f4d6baca3ea32c33551ba00658eab31b))
* getValues for sequence nodes ([b5698ce](https://github.com/Agoric/agoric-sdk/commit/b5698cee87068656cf6cfcbed25925d19fe025fd))
* **internal:** add `BridgeBigInt` type and shape ([9c052a7](https://github.com/Agoric/agoric-sdk/commit/9c052a7f22bd781614f766377da670d7f3505bc6))
* **internal:** Add `defineName` function utility ([b4ce8c7](https://github.com/Agoric/agoric-sdk/commit/b4ce8c758a93d8992707ab3e1edaa58a8f141c39))
* **internal:** Add `pick` utility ([88eda13](https://github.com/Agoric/agoric-sdk/commit/88eda13ababffd588e1358fc711afff8cc6e8ea5))
* **internal:** add `src/lib-nodejs/ava-unhandled-rejection.js` ([22c3c95](https://github.com/Agoric/agoric-sdk/commit/22c3c954e683c866915d1bcb88ac50bae12b55af))
* **internal:** Add an export of const `true` in anticipation of use for `attenuate` ([9becc37](https://github.com/Agoric/agoric-sdk/commit/9becc372d66710a357db5faf653b5cc89f45d9c9))
* **internal:** Add helper `toCLIOptions` ([2532a4f](https://github.com/Agoric/agoric-sdk/commit/2532a4fa649e981d2cf41723187a14d5effb7f0a))
* **internal:** Add helper `unprefixedProperties` for environment variable consumption ([878fecf](https://github.com/Agoric/agoric-sdk/commit/878fecf4f5153fa80f48a27a8b79e67943b2d199))
* **internal:** deepMapObject ([72905fa](https://github.com/Agoric/agoric-sdk/commit/72905fa7be54d1cdb906a019408932e83a9af17e))
* **internal:** fakeStorage.getBody() supports index other than -1 ([eda89cc](https://github.com/Agoric/agoric-sdk/commit/eda89cc7ec56b44f33f8552811c267d01bbf29b0))
* **internal:** fs stream to stdout ([b4af829](https://github.com/Agoric/agoric-sdk/commit/b4af8296e8af37eecf80449870c18546e4c8856a))
* **internal:** Generalize single-level `pick` utility to recursive `attenuate` ([6b36d1e](https://github.com/Agoric/agoric-sdk/commit/6b36d1e5e7e10b9fe62db96294e891978b438c35))
* **internal:** Improve typing ([a7e642f](https://github.com/Agoric/agoric-sdk/commit/a7e642f16da42fdb9c8a0f3e39898f6ed92daa0d))
* **internal:** Introduce deepCopyJsonable ([f875bb0](https://github.com/Agoric/agoric-sdk/commit/f875bb0923323d019396c605ea9bb4d1382f7f79))
* pureDataMarshaller ([6df7f1f](https://github.com/Agoric/agoric-sdk/commit/6df7f1fa33bc0ac3f979663db97859c90af94e6c))
* showValue option for documentStorageSchema ([07d12d4](https://github.com/Agoric/agoric-sdk/commit/07d12d489208735a8304866e3c59e9dc0cd19f13))
* storage-test-utils report missing data ([02c111b](https://github.com/Agoric/agoric-sdk/commit/02c111b7e6a54528186e37f5408d1a41462e5526))
* **swingset:** allow slow termination/deletion of vats ([9ac2ef0](https://github.com/Agoric/agoric-sdk/commit/9ac2ef0c188816e461869f54eb7c15abbaff6efa)), closes [#8928](https://github.com/Agoric/agoric-sdk/issues/8928)
* **testing:** inspectMapStore ([65003a0](https://github.com/Agoric/agoric-sdk/commit/65003a0bc5ca6b8439ef72f159df0ee1b72d238d))
* **types:** ambient exports from agoric/internal ([71d18c4](https://github.com/Agoric/agoric-sdk/commit/71d18c4221f63f1c0e7c45562b5a0a86a0b4b5c0))
* **types:** Tagged ([80d0479](https://github.com/Agoric/agoric-sdk/commit/80d04790429765e81053d45f6f7b17fb7b06b7c6))
* **vat-transfer:** first cut at working proposal ([2864bd5](https://github.com/Agoric/agoric-sdk/commit/2864bd5c12300c3595df9676bcfde894dbe59b29))
* **vow:** abandoned errors are retriable ([1ac054f](https://github.com/Agoric/agoric-sdk/commit/1ac054ffcbf665b885ec55944a0652023139387f))
* **whenable:** first cut ([793f028](https://github.com/Agoric/agoric-sdk/commit/793f028155702e613b1bdf8204af6837cfe5e8a3))
* **zone:** use fresh heap and virtual zones ([7a1a411](https://github.com/Agoric/agoric-sdk/commit/7a1a411cf719477e29a2bedeb91794fd633989e9))

### Bug Fixes

* adopt `VTRANSFER_IBC_EVENT` as an action-type ([#9671](https://github.com/Agoric/agoric-sdk/issues/9671)) ([217005a](https://github.com/Agoric/agoric-sdk/commit/217005a921dcac6928c999e6bfe06330a5947ac5)), closes [#9670](https://github.com/Agoric/agoric-sdk/issues/9670)
* **cosmic-swingset:** inject kernel upgrade events at a safe time ([5789fb6](https://github.com/Agoric/agoric-sdk/commit/5789fb68d316643906bc30506059a0a8c8874154))
* **internal:** better stream error handling ([1ea3f06](https://github.com/Agoric/agoric-sdk/commit/1ea3f06e705b34b50dffa069f4f469f8d9a8184e))
* **internal:** Exempt process.stdout from being closed by makeFsStreamWriter ([117c766](https://github.com/Agoric/agoric-sdk/commit/117c766c38e70f76a683c2f070cddaa8287b7619))
* **internal:** null chain storage uses remotable messenger ([d4afab8](https://github.com/Agoric/agoric-sdk/commit/d4afab86b6a75860b10c22019449ca28035e710d))
* **internal:** severe override taming for bundle-source ([877c1a1](https://github.com/Agoric/agoric-sdk/commit/877c1a13dfdf03f040d3118416e59e58240090ce))
* **network:** use new `ERef` and `FarRef` ([3027adf](https://github.com/Agoric/agoric-sdk/commit/3027adf8613154dec167c5fccf5f207f6d2af701))
* Properly synchronize slog sender termination ([f83c01d](https://github.com/Agoric/agoric-sdk/commit/f83c01d89d80798e0922acdb498fcc7250560977))
* **types:** board ([c73f4f9](https://github.com/Agoric/agoric-sdk/commit/c73f4f9686215a37e8c5f82ce8dbe4742886a02b))
* **types:** DataOnly import of Callable ([717a4c9](https://github.com/Agoric/agoric-sdk/commit/717a4c98aeadaa83897567b46d12b654b0a2cc72))
* **types:** netstring decode ([647afb6](https://github.com/Agoric/agoric-sdk/commit/647afb6b50dd8f77f5fce3199e6e290a1d432fa7))
* **types:** overly constrained deepMapObjectInternal ([b5fcbda](https://github.com/Agoric/agoric-sdk/commit/b5fcbda56f13041c43d08b690b46686268c28514))
* use isPrimitive rather than deprecated isObject ([76ef9a3](https://github.com/Agoric/agoric-sdk/commit/76ef9a357ea25ccd4228320e4323d2afbaa589f0))
* **vow:** correct the typing of `unwrap` ([40ccba1](https://github.com/Agoric/agoric-sdk/commit/40ccba14680f9acf4a68ef32751eb3ac57a4c9bd))
* **vstorage:** Enforce path validation ([03871e8](https://github.com/Agoric/agoric-sdk/commit/03871e8429b81d8f051cef132968abf3a5590e12)), closes [#8337](https://github.com/Agoric/agoric-sdk/issues/8337)
* **zone:** fixups before merging to 7891 ([9bbb393](https://github.com/Agoric/agoric-sdk/commit/9bbb393ac2d0af8e2a3b29adfeabf01c42d9b50e))
* **zone:** no longer getting M from @agoric/zone ([d68bc84](https://github.com/Agoric/agoric-sdk/commit/d68bc8464b0f4df24bd63dd8f5696c6bb6458135))
* **zone:** suggestions for [#7891](https://github.com/Agoric/agoric-sdk/issues/7891) ([e9e0e21](https://github.com/Agoric/agoric-sdk/commit/e9e0e219618449b532ea6303c58415f591b2b49f))

### [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.3.1...@agoric/internal@0.3.2) (2023-06-02)

**Note:** Version bump only for package @agoric/internal

### [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.3.0...@agoric/internal@0.3.1) (2023-05-24)

**Note:** Version bump only for package @agoric/internal

## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.2.1...@agoric/internal@0.3.0) (2023-05-19)

### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers

### Features

* Add SwingSet configuration to purge vstorage within (re-)bootstrap ([f248e91](https://github.com/Agoric/agoric-sdk/commit/f248e9116512374fb95f789b26e27b66cd5c34ca)), closes [#7681](https://github.com/Agoric/agoric-sdk/issues/7681)
* **auction:** add an auctioneer to manage vault liquidation ([#7000](https://github.com/Agoric/agoric-sdk/issues/7000)) ([398b70f](https://github.com/Agoric/agoric-sdk/commit/398b70f7e028f957afc1582f0ee31eb2574c94d0)), closes [#6992](https://github.com/Agoric/agoric-sdk/issues/6992) [#7047](https://github.com/Agoric/agoric-sdk/issues/7047) [#7074](https://github.com/Agoric/agoric-sdk/issues/7074)
* **casting:** handle noData value encoding ([530bc41](https://github.com/Agoric/agoric-sdk/commit/530bc41854cc7f5e5749e97e87fabc6163a17864))
* **cosmic-swingset:** add after-commit action ([970a53f](https://github.com/Agoric/agoric-sdk/commit/970a53f827ded21b27525f6b0042bbc124c62d48))
* **internal:** makeFakeStorageKit supports "get" and "entries" ([6a69aab](https://github.com/Agoric/agoric-sdk/commit/6a69aab5cb54faae5af631bbc2281e4fc4ede8e0))
* **internal:** new `prepareAttenuator` leveraging callbacks ([55599df](https://github.com/Agoric/agoric-sdk/commit/55599dfe7ec43a27387ca64e8bae57be13a38115))
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* **core:** HighPrioritySendersManager ([7b382e4](https://github.com/Agoric/agoric-sdk/commit/7b382e49a1521d367c5b8db18fa7efa2b77ef7e3))
* **cosmic-swingset:** basic snapshot wiring ([b1072d8](https://github.com/Agoric/agoric-sdk/commit/b1072d8b1ddabbb5f2835eb503c945fed3b6b080))
* **cosmic-swingset:** export swingStore kvData to vstorage ([be68431](https://github.com/Agoric/agoric-sdk/commit/be684315dc68ecf0cb603a8eb38ddd5418e996a6))
* **cosmic-swingset:** process highPriorityQueue actions ([182a96e](https://github.com/Agoric/agoric-sdk/commit/182a96e169c8cac7f31fbce014783fd6db72b64c))
* **cosmic-swingset:** remove unnecessary explicit activityhash ([5dcc44d](https://github.com/Agoric/agoric-sdk/commit/5dcc44d31be0c8a95a5749d768791fa35b72dbd3))
* **internal:** add BufferLineTransform ([6e7db7a](https://github.com/Agoric/agoric-sdk/commit/6e7db7af7d93500caf71d817afbb358d33ef01f6))
* **internal:** add sync tee util ([#7560](https://github.com/Agoric/agoric-sdk/issues/7560)) ([0f800a6](https://github.com/Agoric/agoric-sdk/commit/0f800a622b81c61101d96b0ad620ab3065f4b146))
* **internal:** build `chainStorage` from `zone` ([74c62da](https://github.com/Agoric/agoric-sdk/commit/74c62dae7964b488bfdf7c7ee8a9bd930074cea8))
* **internal:** iterable produces values and can be async ([cf4110f](https://github.com/Agoric/agoric-sdk/commit/cf4110f59c228e42e09254b271209a66b9faf3e0))
* **internal:** new `callback` module for durable classless callbacks ([b94d600](https://github.com/Agoric/agoric-sdk/commit/b94d60052e1043fd6fb1ce39530a6072e38ef0d9))
* **internal:** shutdown informs of interrupt signal ([2ce1e89](https://github.com/Agoric/agoric-sdk/commit/2ce1e892eb381a28c31805f48ba65511896ef406))
* assertAllDefined ([d4d6cbd](https://github.com/Agoric/agoric-sdk/commit/d4d6cbd798eee051a8a699c85cc620c6a8298258))
* board-utils ([4f80ad3](https://github.com/Agoric/agoric-sdk/commit/4f80ad3cac3e47a89834f7f98330a47141b6e235))
* type assertion for assertAllDefined ([afa7b5b](https://github.com/Agoric/agoric-sdk/commit/afa7b5bfaf4558a38bdba2c44bf91691f6db26b8))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **vats:** harmonise core/boot.js and boot-psm.js ([4f6635e](https://github.com/Agoric/agoric-sdk/commit/4f6635e550b926d3ca43d9075f26fef3b810817d))

### Bug Fixes

* **internal:** add typing to makeWithQueue ([5b1539b](https://github.com/Agoric/agoric-sdk/commit/5b1539bfc61ea4f937e2f85cbe93c7bccfc84a40))
* **internal:** Make makeFakeStorageKit value auto-wrapping depend upon `sequence: true` ([2751e76](https://github.com/Agoric/agoric-sdk/commit/2751e7626e0ca617cdb2b1d92e5d4d9315b5674a))
* **internal:** more callback typing ([e78e14d](https://github.com/Agoric/agoric-sdk/commit/e78e14d60a78d2e5f9fb9a899053bf778bb51360))
* **internal:** properly inherit from `chainStorageNode` ([134a977](https://github.com/Agoric/agoric-sdk/commit/134a977f7bc4a2fc6eff3868d4d415c8c9714b4b))
* **internal:** Restore support for passable-symbol method keys ([54271af](https://github.com/Agoric/agoric-sdk/commit/54271af10adb144fe6d562193afa473d74425854))
* **internal:** shutdown beforeExit avoids forced exit ([34c9f44](https://github.com/Agoric/agoric-sdk/commit/34c9f442f124cd7181b538cf8754c6180c863b32))
* **internal:** Validate Callback targets ([8880ada](https://github.com/Agoric/agoric-sdk/commit/8880ada791d70dd487770e8a0fa4b6b725aa8769))
* **notifier:** Add a makeDurablePublishKit "onAdvance" option ([4c62b52](https://github.com/Agoric/agoric-sdk/commit/4c62b52b94cbc9ccb3c7388f5e94589809e6d7fd)), closes [#7303](https://github.com/Agoric/agoric-sdk/issues/7303)
* adapt to deeplyFulfilled being async ([#6816](https://github.com/Agoric/agoric-sdk/issues/6816)) ([ec315e1](https://github.com/Agoric/agoric-sdk/commit/ec315e1634f6d5cdef1cddafc18777de7c04fecc))
* **telemetry:** partially undo [#6684](https://github.com/Agoric/agoric-sdk/issues/6684) ([b9fa85b](https://github.com/Agoric/agoric-sdk/commit/b9fa85b7307124e50cc3a84d3b694307cde55f54))
* avoid using top-level `require` ([57ca2db](https://github.com/Agoric/agoric-sdk/commit/57ca2dbfbadb373f97d43b2fb4e90302c9149976))
* **types:** type assertion for assertAllDefined ([25f16b2](https://github.com/Agoric/agoric-sdk/commit/25f16b2e935931b81313d2ee1d491b305088bb7a))
* track endo 1382 fix to 6570 ([#6612](https://github.com/Agoric/agoric-sdk/issues/6612)) ([7897761](https://github.com/Agoric/agoric-sdk/commit/7897761d6e19e6bbba42e7bd0bd5befb507afa08))

### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/internal@0.2.0...@agoric/internal@0.2.1) (2022-10-05)

### Bug Fixes

* protect zoe from keyword collision ([#6370](https://github.com/Agoric/agoric-sdk/issues/6370)) ([02af4a0](https://github.com/Agoric/agoric-sdk/commit/02af4a07ad1f99b545d0bf525bd1ea97d74639d1))

## 0.2.0 (2022-09-20)

### ⚠ BREAKING CHANGES

* **SwingSet:** Representatives inherit bound methods (#5970)

### Features

* **internal:** add async utils from loadgen ([5d9f411](https://github.com/Agoric/agoric-sdk/commit/5d9f411a124e4028cd88764084999fb1fd791609))
* **internal:** deeplyFulfilledObject ([11fd071](https://github.com/Agoric/agoric-sdk/commit/11fd071005741719286ae6a1bb6bb9a7fd1f65b7))

### Bug Fixes

* **SwingSet:** Representatives inherit bound methods ([#5970](https://github.com/Agoric/agoric-sdk/issues/5970)) ([ba1ed62](https://github.com/Agoric/agoric-sdk/commit/ba1ed62062a63862e2eecb598b0bd1d2ac828e1f))
