# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.6.1...@agoric/notifier@0.6.2) (2023-06-02)

**Note:** Version bump only for package @agoric/notifier





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.6.0...@agoric/notifier@0.6.1) (2023-05-24)

**Note:** Version bump only for package @agoric/notifier





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.5.1...@agoric/notifier@0.6.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* emit smallcaps-format data in all marshallers
* **notifier:** Stop retaining durable publish kit values in RAM
* move PublicTopic to Zoe contractSupport
* remove deprecated pipeTopicToStorage
* rm obsolete makeStorageNodePathProvider
* **notifier:** tidy up the implementation

### Features

* **notifier:** implement `AsyncIterableIterator` for better generator support ([0764b9e](https://github.com/Agoric/agoric-sdk/commit/0764b9e48cdd0e6677bb8a35ac978c7873ea3e18))
* **notifier:** introduce IterableEachTopic and IterableLatestTopic ([9e3096d](https://github.com/Agoric/agoric-sdk/commit/9e3096da86bd8373a86fd21655ce0e71826be900))
* Add incarnation number to the transcript store records ([5d64be7](https://github.com/Agoric/agoric-sdk/commit/5d64be7aa1fd222822b145240f541f5eabb01c43)), closes [#7482](https://github.com/Agoric/agoric-sdk/issues/7482)
* emit smallcaps-format data in all marshallers ([1753df8](https://github.com/Agoric/agoric-sdk/commit/1753df83465785b5ee71b250770c9b012d750ffc)), closes [#6822](https://github.com/Agoric/agoric-sdk/issues/6822)
* **casting:** handle noData value encoding ([530bc41](https://github.com/Agoric/agoric-sdk/commit/530bc41854cc7f5e5749e97e87fabc6163a17864))
* **contractSupport:** PublicTopics types and utils ([2c7865f](https://github.com/Agoric/agoric-sdk/commit/2c7865fa4e43c96c9a85be743a7f808a66b9311e))
* **notifier:** create `src/subscribe.js` ([8029c97](https://github.com/Agoric/agoric-sdk/commit/8029c97d58c093ccb7e3f58c8936828996231e66))
* **notifier:** Introduce durable publish kits ([#6502](https://github.com/Agoric/agoric-sdk/issues/6502)) ([8f7b353](https://github.com/Agoric/agoric-sdk/commit/8f7b3530ca50dc1945f024690a63914fe8431502))
* **notifier:** Opportunistic eachIterator recovery from upgrade disconnection ([229d7b2](https://github.com/Agoric/agoric-sdk/commit/229d7b260b63277c77b7d2199b6bc956ab5edc80))
* **notifier:** subscribeLatest iterators retry when broken by vat upgrade ([e96a0ee](https://github.com/Agoric/agoric-sdk/commit/e96a0eeeeac500e0843cc29a17d58975817c7c8b)), closes [#5185](https://github.com/Agoric/agoric-sdk/issues/5185)
* **notifier:** tidy up the implementation ([89af682](https://github.com/Agoric/agoric-sdk/commit/89af6827e88966c836bf28f5900edf189aab9926))
* getPath() on StorageNode and StoredSubscriber ([dae47a5](https://github.com/Agoric/agoric-sdk/commit/dae47a553288335960b5e4f2741a09b87ae896bc))
* makeStoredNotifier ([cb1dde8](https://github.com/Agoric/agoric-sdk/commit/cb1dde882cd7630940033d0ff933fc03303dac7d))
* support TopicsRecord ([8618461](https://github.com/Agoric/agoric-sdk/commit/8618461781fe11f28e6b891a4d31ebfd9dda5e0d))
* **topics:** makePublicTopic ([c8b464c](https://github.com/Agoric/agoric-sdk/commit/c8b464c26c53535097e4df573e126c81e00e5aa6))
* pipeTopicToStorage ([69ca308](https://github.com/Agoric/agoric-sdk/commit/69ca308fdbc63a5ec956e3a0cde72f6b80ad4be8))
* StorageNodeShape ([e585fa0](https://github.com/Agoric/agoric-sdk/commit/e585fa0c73f29ea0d57b6a8ec43cd4fe78575663))


### Bug Fixes

* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric-sdk/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* **ERTP:** `getCurrentAmountNotifier` returns a `LatestTopic` ([735d005](https://github.com/Agoric/agoric-sdk/commit/735d005ec4f4087a4055d48ff1dd1801c9a3d836))
* **notifier:** Stop retaining durable publish kit values in RAM ([2a41c93](https://github.com/Agoric/agoric-sdk/commit/2a41c93378ae14a348f43eaad46336cda1cb3627)), closes [#7298](https://github.com/Agoric/agoric-sdk/issues/7298)
* some stateShapes ([50c9fe4](https://github.com/Agoric/agoric-sdk/commit/50c9fe49d0fe890a08c0c28a00780f4924f7928c))
* **notifier:** Add a makeDurablePublishKit "onAdvance" option ([4c62b52](https://github.com/Agoric/agoric-sdk/commit/4c62b52b94cbc9ccb3c7388f5e94589809e6d7fd)), closes [#7303](https://github.com/Agoric/agoric-sdk/issues/7303)
* **notifier:** For durable `fail()`, persist the reason rather than a rejected promise ([#7011](https://github.com/Agoric/agoric-sdk/issues/7011)) ([0d63b64](https://github.com/Agoric/agoric-sdk/commit/0d63b6468b7dd5fdb64ed4b1b563befae7406874)), closes [#7009](https://github.com/Agoric/agoric-sdk/issues/7009)
* **notifier:** rely on `@endo/far` ([c103b85](https://github.com/Agoric/agoric-sdk/commit/c103b85a65bdd5ef1666c6762250f63a799e5f38))
* **notifier:** Remove the makeDurablePublishKit "onAdvance" option ([#7370](https://github.com/Agoric/agoric-sdk/issues/7370)) ([6861f5e](https://github.com/Agoric/agoric-sdk/commit/6861f5e6479dffba9ab8b366f48791f9649b3a59)), closes [#7341](https://github.com/Agoric/agoric-sdk/issues/7341) [#7350](https://github.com/Agoric/agoric-sdk/issues/7350)
* **SwingSet:** Remove metering notifiers ([#7347](https://github.com/Agoric/agoric-sdk/issues/7347)) ([0c75d7c](https://github.com/Agoric/agoric-sdk/commit/0c75d7cf1a1c54ba67d3d199c0674d0f22fb52ba)), closes [#7324](https://github.com/Agoric/agoric-sdk/issues/7324)
* makeStoredSubscriber w/durable Subscriber ([eba4492](https://github.com/Agoric/agoric-sdk/commit/eba4492fcffa946000be19b3f8264462eecfe977))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* **vats:** use async chainStorage methods ([0507206](https://github.com/Agoric/agoric-sdk/commit/05072067b28b146c5836a456d5824a63776980b0))
* repair version shear ([59de3ab](https://github.com/Agoric/agoric-sdk/commit/59de3ab131d61a6fe2915adc795f0442a94cb7b6))


### Miscellaneous Chores

* remove deprecated pipeTopicToStorage ([6a6108a](https://github.com/Agoric/agoric-sdk/commit/6a6108aeb00c676fe1db130f1baea9a98c1d8e8b))
* rm obsolete makeStorageNodePathProvider ([dc0a4a5](https://github.com/Agoric/agoric-sdk/commit/dc0a4a545d89c8bf89bf44e7c888537ddf626522))


### Code Refactoring

* move PublicTopic to Zoe contractSupport ([c51ea3d](https://github.com/Agoric/agoric-sdk/commit/c51ea3de22f50e05fcc1aaabd2108e785d51eb2e))



### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.5.0...@agoric/notifier@0.5.1) (2022-10-05)

**Note:** Version bump only for package @agoric/notifier





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.4.0...@agoric/notifier@0.5.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **notifier:** no initial state for makePublishKit (#5742)

### Features

* **notifier:** `makeStoredSubscription` ([8206291](https://github.com/Agoric/agoric-sdk/commit/82062910b9d8c57f76851e3f6bd5f405a47e04eb))
* **notifier:** Add makeNotifierFromSubscriber ([#5737](https://github.com/Agoric/agoric-sdk/issues/5737)) ([077718a](https://github.com/Agoric/agoric-sdk/commit/077718a1748616bb8b72a75e1e1b54f5cf590125)), closes [#5413](https://github.com/Agoric/agoric-sdk/issues/5413)
* **notifier:** allow `makeSubscriptionKit(initialState)` ([affccab](https://github.com/Agoric/agoric-sdk/commit/affccabfb3d4534792f1e9234a50d9f97db2c11c))
* **notifier:** makeStoredPublisherKit ([b652109](https://github.com/Agoric/agoric-sdk/commit/b6521097d83d6deabfcc600130cd31ed2352d234))
* **notifier:** makeStoredPublishKit ([6cf9ced](https://github.com/Agoric/agoric-sdk/commit/6cf9cedf9e79d4e3ff09c54d54702604b9567aa9))
* **notifier:** return self for `getStoreKey` ([385e7bb](https://github.com/Agoric/agoric-sdk/commit/385e7bbbbca5bfdc7ff0a99db6e14f1a70b5891e))
* **ses-ava:** support full API of Ava ([3b5fd6c](https://github.com/Agoric/agoric-sdk/commit/3b5fd6c103a4a9207eaf2e761b3a096ce78c3d16))


### Bug Fixes

* avoid relying on bound `E` proxy methods ([#5998](https://github.com/Agoric/agoric-sdk/issues/5998)) ([497d157](https://github.com/Agoric/agoric-sdk/commit/497d157d29cc8dda58eca9e07c24b57731647074))
* **notifier:** Sink the E wrapper for end-of-publication ([7298092](https://github.com/Agoric/agoric-sdk/commit/7298092a2ebff5577c78956eaad77f4518211f63))
* makePublishKit ([#5435](https://github.com/Agoric/agoric-sdk/issues/5435)) ([d8228d2](https://github.com/Agoric/agoric-sdk/commit/d8228d272cfe18aa2fba713fb5acc4e84eaa1e39))
* **notifier:** reject iteration if an observer throws ([d76f42b](https://github.com/Agoric/agoric-sdk/commit/d76f42b1deb2a4fc280faef4ce74046b4b7cded0))


### Code Refactoring

* **notifier:** no initial state for makePublishKit ([#5742](https://github.com/Agoric/agoric-sdk/issues/5742)) ([4888cac](https://github.com/Agoric/agoric-sdk/commit/4888cac19268ecae9066743566e25190fc0af772))



## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.35...@agoric/notifier@0.4.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.3.35](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.34...@agoric/notifier@0.3.35) (2022-02-24)

**Note:** Version bump only for package @agoric/notifier





### [0.3.34](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.33...@agoric/notifier@0.3.34) (2022-02-21)


### Bug Fixes

* **notifier:** make the `Updater` a Far object ([20707a1](https://github.com/Agoric/agoric-sdk/commit/20707a137fe8ccb7f685fb4bb79b66094efa902b))
* **store:** use explicit `import('@endo/marshal')` JSDoc ([4795147](https://github.com/Agoric/agoric-sdk/commit/47951473d4679c7e95104f5ae32fe63c8547598e))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))



### [0.3.33](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.32...@agoric/notifier@0.3.33) (2021-12-22)

**Note:** Version bump only for package @agoric/notifier





### [0.3.32](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.31...@agoric/notifier@0.3.32) (2021-12-02)


### Features

* **notifier:** `makeNotifierFromAsyncIterable` works with ERefs ([0d330a3](https://github.com/Agoric/agoric-sdk/commit/0d330a30b6c65e456e794b480d9605ee178a9bce))
* **notifier:** convey internal type parameters ([a4626f3](https://github.com/Agoric/agoric-sdk/commit/a4626f354ead6a9cddad5f8c49a8f18a3b693ee9))



### [0.3.31](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.30...@agoric/notifier@0.3.31) (2021-10-13)


### Bug Fixes

* adapt timers to async iterables ([#3949](https://github.com/Agoric/agoric-sdk/issues/3949)) ([9739127](https://github.com/Agoric/agoric-sdk/commit/9739127262e9fac48757094a4d2d9f3f35f4bfc5))



### [0.3.30](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.29...@agoric/notifier@0.3.30) (2021-09-23)

**Note:** Version bump only for package @agoric/notifier





### [0.3.29](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.28...@agoric/notifier@0.3.29) (2021-09-15)


### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.3.28](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.27...@agoric/notifier@0.3.28) (2021-08-18)

**Note:** Version bump only for package @agoric/notifier





### [0.3.27](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.26...@agoric/notifier@0.3.27) (2021-08-17)

**Note:** Version bump only for package @agoric/notifier





### [0.3.26](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.25...@agoric/notifier@0.3.26) (2021-08-16)

**Note:** Version bump only for package @agoric/notifier





### [0.3.25](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.22...@agoric/notifier@0.3.25) (2021-08-15)

### 0.26.10 (2021-07-28)

**Note:** Version bump only for package @agoric/notifier





### [0.3.24](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.22...@agoric/notifier@0.3.24) (2021-08-14)

### 0.26.10 (2021-07-28)

**Note:** Version bump only for package @agoric/notifier





### [0.3.23](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.22...@agoric/notifier@0.3.23) (2021-07-28)

**Note:** Version bump only for package @agoric/notifier





### [0.3.22](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.21...@agoric/notifier@0.3.22) (2021-07-01)

**Note:** Version bump only for package @agoric/notifier





### [0.3.21](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.20...@agoric/notifier@0.3.21) (2021-06-28)

**Note:** Version bump only for package @agoric/notifier





### [0.3.20](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.19...@agoric/notifier@0.3.20) (2021-06-25)

**Note:** Version bump only for package @agoric/notifier





### [0.3.19](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.18...@agoric/notifier@0.3.19) (2021-06-24)

**Note:** Version bump only for package @agoric/notifier





### [0.3.18](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.17...@agoric/notifier@0.3.18) (2021-06-24)

**Note:** Version bump only for package @agoric/notifier





### [0.3.17](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.16...@agoric/notifier@0.3.17) (2021-06-23)

**Note:** Version bump only for package @agoric/notifier





### [0.3.16](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.15...@agoric/notifier@0.3.16) (2021-06-16)

**Note:** Version bump only for package @agoric/notifier





### [0.3.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.14...@agoric/notifier@0.3.15) (2021-06-15)


### Bug Fixes

* **notifier:** Stronger assertion to work around harden type weakness ([2b3fe0e](https://github.com/Agoric/agoric-sdk/commit/2b3fe0efa002dc6535723d16f81129f843c0f515))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))



## [0.3.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.13...@agoric/notifier@0.3.14) (2021-05-10)

**Note:** Version bump only for package @agoric/notifier





## [0.3.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.12...@agoric/notifier@0.3.13) (2021-05-05)

**Note:** Version bump only for package @agoric/notifier





## [0.3.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.11...@agoric/notifier@0.3.12) (2021-05-05)


### Bug Fixes

* update types and implementation now that Far preserves them ([a4695c4](https://github.com/Agoric/agoric-sdk/commit/a4695c43a09abc92a20c12104cfbfefb4cae2ff2))





## [0.3.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.10...@agoric/notifier@0.3.11) (2021-04-22)

**Note:** Version bump only for package @agoric/notifier





## [0.3.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.9...@agoric/notifier@0.3.10) (2021-04-18)

**Note:** Version bump only for package @agoric/notifier





## [0.3.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.8...@agoric/notifier@0.3.9) (2021-04-16)

**Note:** Version bump only for package @agoric/notifier





## [0.3.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.7...@agoric/notifier@0.3.8) (2021-04-14)

**Note:** Version bump only for package @agoric/notifier





## [0.3.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.6...@agoric/notifier@0.3.7) (2021-04-13)

**Note:** Version bump only for package @agoric/notifier





## [0.3.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.5...@agoric/notifier@0.3.6) (2021-04-07)

**Note:** Version bump only for package @agoric/notifier





## [0.3.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.4...@agoric/notifier@0.3.5) (2021-04-06)

**Note:** Version bump only for package @agoric/notifier





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.3...@agoric/notifier@0.3.4) (2021-03-24)

**Note:** Version bump only for package @agoric/notifier





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.2...@agoric/notifier@0.3.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **notifier:** add Far/Data to notifier ([#2565](https://github.com/Agoric/agoric-sdk/issues/2565)) ([49a6a8e](https://github.com/Agoric/agoric-sdk/commit/49a6a8ef765f0a6cc94d7f7b0a4b2e8ed71bce8e)), closes [#2545](https://github.com/Agoric/agoric-sdk/issues/2545) [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.1...@agoric/notifier@0.3.2) (2021-02-22)

**Note:** Version bump only for package @agoric/notifier





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.3.0...@agoric/notifier@0.3.1) (2021-02-16)


### Bug Fixes

* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.3...@agoric/notifier@0.3.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





## [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.3-dev.0...@agoric/notifier@0.2.3) (2020-11-07)

**Note:** Version bump only for package @agoric/notifier





## [0.2.3-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2...@agoric/notifier@0.2.3-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.2...@agoric/notifier@0.2.2) (2020-10-11)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.1...@agoric/notifier@0.2.2-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.2-dev.0...@agoric/notifier@0.2.2-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.2-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.1...@agoric/notifier@0.2.2-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/notifier





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.2.0...@agoric/notifier@0.2.1) (2020-09-16)

**Note:** Version bump only for package @agoric/notifier





# [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.3...@agoric/notifier@0.2.0) (2020-08-31)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* clean up E.when and E.resolve ([#1561](https://github.com/Agoric/agoric-sdk/issues/1561)) ([634046c](https://github.com/Agoric/agoric-sdk/commit/634046c0fc541fc1db258105a75c7313b5668aa0))
* kickOut takes a `reason` error rather than a `message` string ([#1567](https://github.com/Agoric/agoric-sdk/issues/1567)) ([c3cd536](https://github.com/Agoric/agoric-sdk/commit/c3cd536f16dcf30208d88fb1c81376aa916e2a40))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename produceNotifier to makeNotifierKit ([#1330](https://github.com/Agoric/agoric-sdk/issues/1330)) ([e5034f9](https://github.com/Agoric/agoric-sdk/commit/e5034f94e33e9c90c6a8fcaff70c11773e13e969))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))


### Features

* adaptors between notifiers and async iterables ([#1340](https://github.com/Agoric/agoric-sdk/issues/1340)) ([b67d21a](https://github.com/Agoric/agoric-sdk/commit/b67d21aae7e66202e3a5a3f13c7bd5769061230e))





## [0.1.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.2...@agoric/notifier@0.1.3) (2020-06-30)

**Note:** Version bump only for package @agoric/notifier





## [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.1...@agoric/notifier@0.1.2) (2020-05-17)

**Note:** Version bump only for package @agoric/notifier





## [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/notifier@0.1.0...@agoric/notifier@0.1.1) (2020-05-10)

**Note:** Version bump only for package @agoric/notifier





# 0.1.0 (2020-05-04)


### Features

* Add a notifier facility for Zoe and contracts ([7d6e2a6](https://github.com/Agoric/agoric-sdk/commit/7d6e2a6eae5793c2a4b451405a0f4337bfcaa448))








## 0.0.1 (2020-04-15)

Initial Version
