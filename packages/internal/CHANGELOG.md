# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
