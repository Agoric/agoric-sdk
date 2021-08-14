# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.4.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.6...@agoric/swing-store-simple@0.4.8) (2021-08-14)

### 0.26.10 (2021-07-28)

**Note:** Version bump only for package @agoric/swing-store-simple





### [0.4.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.6...@agoric/swing-store-simple@0.4.7) (2021-07-28)

**Note:** Version bump only for package @agoric/swing-store-simple





### [0.4.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.5...@agoric/swing-store-simple@0.4.6) (2021-07-01)


### Bug Fixes

* repair stream store self-interference problem ([948d837](https://github.com/Agoric/agoric-sdk/commit/948d837c5eb25e0085480804d9d2d4bab0729818)), closes [#3437](https://github.com/Agoric/agoric-sdk/issues/3437)



### [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.4...@agoric/swing-store-simple@0.4.5) (2021-06-28)


### Features

* demand-paged vats are reloaded from heap snapshots ([#2848](https://github.com/Agoric/agoric-sdk/issues/2848)) ([cb239cb](https://github.com/Agoric/agoric-sdk/commit/cb239cbb27943ad58c304d85ee9b61ba917af79c)), closes [#2273](https://github.com/Agoric/agoric-sdk/issues/2273) [#2277](https://github.com/Agoric/agoric-sdk/issues/2277) [#2422](https://github.com/Agoric/agoric-sdk/issues/2422)



### [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.3...@agoric/swing-store-simple@0.4.4) (2021-06-25)

**Note:** Version bump only for package @agoric/swing-store-simple





### [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.2...@agoric/swing-store-simple@0.4.3) (2021-06-24)

**Note:** Version bump only for package @agoric/swing-store-simple





### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.1...@agoric/swing-store-simple@0.4.2) (2021-06-23)

**Note:** Version bump only for package @agoric/swing-store-simple





### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.4.0...@agoric/swing-store-simple@0.4.1) (2021-06-16)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.9...@agoric/swing-store-simple@0.4.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **swing-store-simple:** This includes a renaming and refactoring of the constructors to
acknowledge that the different SwingStore constructors are not polymorphic.
* **swing-store-simple:** most uses of simple swing store use it to get a purely
in-memory store for testing purposes, but a few places used the older .jsonlines
thing for simple persistence.  Any existing code that did that requires revision
to use swing-store-lmdb or another persistence mechanism, though all the known
cases that did that have been so revised as part of this update.

### Features

* **swing-store-simple:** refactor and rename constructors ([1c986ba](https://github.com/Agoric/agoric-sdk/commit/1c986baf778f1621328a42d7b4454c196f7befd7))
* **swing-store-simple:** remove .jsonlines hack from simple swing store ([f3b020a](https://github.com/Agoric/agoric-sdk/commit/f3b020a720bfe33ce67764dceb89b5aeb698855a))
* greater paranoia about concurrent access ([e67c4ef](https://github.com/Agoric/agoric-sdk/commit/e67c4ef37d2a0d9361612401b43c2b81a4ebc66d))
* move transcripts out of key-value store and into stream stores ([a128e93](https://github.com/Agoric/agoric-sdk/commit/a128e93803344d8a36140d53d3e7711bec5c2511))
* overhaul stream store API to better fit actual use in kernel ([c5cc00a](https://github.com/Agoric/agoric-sdk/commit/c5cc00a9e0f1c90ee2cb57fe6c3767a285f4d8e3))
* provide streamStore implementations ([e094914](https://github.com/Agoric/agoric-sdk/commit/e094914ad5ceec3d1131270e5943c6f0df267cac))
* remove .jsonlines hack from simple swing store ([ef87997](https://github.com/Agoric/agoric-sdk/commit/ef87997a1519b18f23656b57bf38055fea203f9a))


### Bug Fixes

* convert swing-store-simple to "type": "module" ([93279c1](https://github.com/Agoric/agoric-sdk/commit/93279c10a01ce55790a0aa8b5f9e2b2ce7e1732e))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* tweaks and cleanup based on review feedback ([ba95e34](https://github.com/Agoric/agoric-sdk/commit/ba95e34622063eaae47335a0260a004a3a159807))
* undo 93279c10a01ce55790a0aa8b5f9e2b2ce7e1732e which broke things ([609c973](https://github.com/Agoric/agoric-sdk/commit/609c973bff5f40fe52f054b97fb3518e08022afc))



## [0.3.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.8...@agoric/swing-store-simple@0.3.9) (2021-05-10)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.7...@agoric/swing-store-simple@0.3.8) (2021-05-05)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.6...@agoric/swing-store-simple@0.3.7) (2021-05-05)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.5...@agoric/swing-store-simple@0.3.6) (2021-04-07)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.4...@agoric/swing-store-simple@0.3.5) (2021-04-06)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.3...@agoric/swing-store-simple@0.3.4) (2021-03-24)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.2...@agoric/swing-store-simple@0.3.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.1...@agoric/swing-store-simple@0.3.2) (2021-02-22)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.3.0...@agoric/swing-store-simple@0.3.1) (2021-02-16)

**Note:** Version bump only for package @agoric/swing-store-simple





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.7...@agoric/swing-store-simple@0.3.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





## [0.2.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.7-dev.0...@agoric/swing-store-simple@0.2.7) (2020-11-07)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.7-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.6...@agoric/swing-store-simple@0.2.7-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.6-dev.2...@agoric/swing-store-simple@0.2.6) (2020-10-11)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.6-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.6-dev.1...@agoric/swing-store-simple@0.2.6-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.6-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.6-dev.0...@agoric/swing-store-simple@0.2.6-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.6-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.5...@agoric/swing-store-simple@0.2.6-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.4...@agoric/swing-store-simple@0.2.5) (2020-09-16)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.3...@agoric/swing-store-simple@0.2.4) (2020-08-31)


### Bug Fixes

* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))





## [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.2...@agoric/swing-store-simple@0.2.3) (2020-06-30)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.1...@agoric/swing-store-simple@0.2.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.2.0...@agoric/swing-store-simple@0.2.1) (2020-05-10)

**Note:** Version bump only for package @agoric/swing-store-simple





# [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.1.2...@agoric/swing-store-simple@0.2.0) (2020-05-04)


### Features

* swing-store-simple: add isSwingStore() query ([c450459](https://github.com/Agoric/agoric-sdk/commit/c450459a92d3ecba4a106820d980683babdf8c29)), closes [#953](https://github.com/Agoric/agoric-sdk/issues/953)





## [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.1.2-alpha.0...@agoric/swing-store-simple@0.1.2) (2020-04-13)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.1.2-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.1.1...@agoric/swing-store-simple@0.1.2-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/swing-store-simple





## [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swing-store-simple@0.1.1-alpha.0...@agoric/swing-store-simple@0.1.1) (2020-04-02)

**Note:** Version bump only for package @agoric/swing-store-simple





## 0.1.1-alpha.0 (2020-04-02)

**Note:** Version bump only for package @agoric/swing-store-simple





## 0.1.1-alpha.0 (2020-04-02)

**Note:** Version bump only for package @agoric/swing-store-simple
