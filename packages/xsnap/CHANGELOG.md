# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.14.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.14.1...@agoric/xsnap@0.14.2) (2023-06-02)


### Bug Fixes

* **xsnap:** update Moddable SDK to fix BigInt arithmetic ([a71f2f2](https://github.com/Agoric/agoric-sdk/commit/a71f2f2c76ed6da9c9fac25e1aa8974d1451588c))



### [0.14.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.14.0...@agoric/xsnap@0.14.1) (2023-05-24)


### Bug Fixes

* **xsnap:** agd checks 'xsnap -n' for agoric-upgrade-10 ([842b440](https://github.com/Agoric/agoric-sdk/commit/842b4402eb857d09856cd8a77159db3a464d86f9)), closes [#7012](https://github.com/Agoric/agoric-sdk/issues/7012)
* **xsnap:** use newer xsnap-pub, with requirement for __has_builtin ([99de101](https://github.com/Agoric/agoric-sdk/commit/99de101cfe2a7d44464d64c8c55bbc71151b1f2f)), closes [#7829](https://github.com/Agoric/agoric-sdk/issues/7829)



## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.13.2...@agoric/xsnap@0.14.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* **xsnap:** start xsnap takes snapshot stream
* **xsnap:** makeSnapshot yields snapshot data
* **xsnap:** Update Moddable SDK and xsnap-native
* **xsnap:** Update Moddable SDK and xsnap-native (#6920)

### Features

* **xsnap:** Handle snapshot written size in command response ([6dfe7b0](https://github.com/Agoric/agoric-sdk/commit/6dfe7b0461a6c45b00b80cbb847985dbce1709e3))
* **xsnap:** makeSnapshot yields snapshot data ([348bbd2](https://github.com/Agoric/agoric-sdk/commit/348bbd2d9c251e7ec0f0aa109034d4bdb5ce89e4))
* **xsnap:** makeSnapshotStream over process pipe ([c0be80d](https://github.com/Agoric/agoric-sdk/commit/c0be80d5964748e2dabe1903bef5b7b1c6eb8e85))
* **xsnap:** start xsnap takes snapshot stream ([ed87de1](https://github.com/Agoric/agoric-sdk/commit/ed87de12e46095aa18f56b7d0118c6c76d5bef64))
* **xsnap:** stream start snapshot over pipe ([3f77ff9](https://github.com/Agoric/agoric-sdk/commit/3f77ff90e918280fb07055c602b56871f342365d))
* **xsnap:** Update Moddable SDK and xsnap-native ([2095474](https://github.com/Agoric/agoric-sdk/commit/2095474ed69ff0e6aa3a4fa7edcefe988011513d))
* **xsnap:** Update Moddable SDK and xsnap-native ([#6920](https://github.com/Agoric/agoric-sdk/issues/6920)) ([ddb745b](https://github.com/Agoric/agoric-sdk/commit/ddb745bb1a940cd81dae34c642eb357faca0150b))
* **xsnap:** use XS native harden ([037167f](https://github.com/Agoric/agoric-sdk/commit/037167fd9d071f8525401b15e13809ebf910f106))
* create new xsnap-lockdown package ([2af831d](https://github.com/Agoric/agoric-sdk/commit/2af831d9683a4080168ee267e8d57227d2167f37)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)


### Bug Fixes

* **xsnap:** add untracked build-env file ([223a74b](https://github.com/Agoric/agoric-sdk/commit/223a74bd0fb6139e6240c57d63297080293cfcd5))
* **xsnap:** cleanly close using message ([ae54724](https://github.com/Agoric/agoric-sdk/commit/ae54724e7c1882d5dd235f2207dd0a1a7794d35a))
* **xsnap:** makeSnapshot synchronously takes baton ([8d511e8](https://github.com/Agoric/agoric-sdk/commit/8d511e82b50a4226d3da22dc3c6d0df95609dfaf))



### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.13.2...@agoric/xsnap@0.13.3) (2023-02-17)


### Bug Fixes

* **xsnap:** Update Moddable SDK with divergence fixes ([#6758](https://github.com/Agoric/agoric-sdk/issues/6758)) ([fc6afec](https://github.com/Agoric/agoric-sdk/commit/fc6afecb6b752a019c34377a863eb58108944dc3))



### [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.13.1...@agoric/xsnap@0.13.2) (2022-10-05)

**Note:** Version bump only for package @agoric/xsnap





### [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.13.0...@agoric/xsnap@0.13.1) (2022-09-20)


### Bug Fixes

* lints ([23d64ea](https://github.com/Agoric/agoric-sdk/commit/23d64eaa65feb858e3f49d483a94950eaa64e834))
* xsnap parent kills worker upon receipt of unrecognized response ([5489221](https://github.com/Agoric/agoric-sdk/commit/548922158de572f2eb651eb2a08313559b9bfe35)), closes [#6257](https://github.com/Agoric/agoric-sdk/issues/6257)
* **SwingSet:** Apply netstring limit to xsnap workers ([f8365b2](https://github.com/Agoric/agoric-sdk/commit/f8365b26dd79967895a4d88966521d067b982206))
* **xsnap:** bump METER_TYPE to match recent XS udpate ([32e9509](https://github.com/Agoric/agoric-sdk/commit/32e950944420de4900c5f671e054524f3a0ae377)), closes [#5338](https://github.com/Agoric/agoric-sdk/issues/5338)
* **xsnap:** do not leak through vat termination race ([#5643](https://github.com/Agoric/agoric-sdk/issues/5643)) ([8201050](https://github.com/Agoric/agoric-sdk/commit/8201050103b1b2c76736b80ac4db9ec7f78dfdc7))
* **xsnap:** fix test which reused a mutable ArrayBuffer ([5606b52](https://github.com/Agoric/agoric-sdk/commit/5606b529b2c143cdb4e8d0f0cf28dd043fa4bdb1))
* **xsnap:** Handle endo init vetted shims in ava-xs ([cd7b880](https://github.com/Agoric/agoric-sdk/commit/cd7b880592578502b71c0297cad37be2672e0680))
* **xsnap:** prevent out of command execution ([84cf363](https://github.com/Agoric/agoric-sdk/commit/84cf363fb83c7d96046e5540b4857cc5f584ba89))
* **xsnap:** prohibit leading hyphen in options.name ([a3db601](https://github.com/Agoric/agoric-sdk/commit/a3db60172ae21ec57f3456bac9243aa732cfeba5))
* **xsnap:** upgrade to latest xsnap, now with timestamps ([c857cc8](https://github.com/Agoric/agoric-sdk/commit/c857cc83b744213cfa962ac5e250c977e18df48e)), closes [#5152](https://github.com/Agoric/agoric-sdk/issues/5152)
* **xsnap:** upgrade to xsnap-native with exit on unknown command ([37a01a4](https://github.com/Agoric/agoric-sdk/commit/37a01a41c60338d4d7614d68b5913126956e4630))
* **xsnap:** Use Moddable SDK and xsnap with WeakRef and snapshot patch ([374e7d5](https://github.com/Agoric/agoric-sdk/commit/374e7d5bcea922734ab347af5e4e98bd682e8099))
* **xsnap:** use patched XS to fix heap-snapshot-writing memory leak ([#5987](https://github.com/Agoric/agoric-sdk/issues/5987)) ([9e2c1da](https://github.com/Agoric/agoric-sdk/commit/9e2c1da92d865ce02dc766b1072c8c3209b0cfe9)), closes [#5975](https://github.com/Agoric/agoric-sdk/issues/5975)
* **xsnap:** Use xsnap with fixed timestamps ([#6151](https://github.com/Agoric/agoric-sdk/issues/6151)) ([9ba7842](https://github.com/Agoric/agoric-sdk/commit/9ba78424a4bd587d0009a6816b7ffcedd5d7f972))
* **xsnap:** workaround unexpected worker exit ([267f83c](https://github.com/Agoric/agoric-sdk/commit/267f83c06bcd87ad02d45502a4e3a5c744a3c533))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **xsnap:** XS error stack behavior change ([444d6cb](https://github.com/Agoric/agoric-sdk/commit/444d6cbd4cd276a9cd9af48ceb9513c81d83b475))
* **xsnap:** xsnap process drops context after exit ([26766f6](https://github.com/Agoric/agoric-sdk/commit/26766f6623cc5d07aa1c52257cf54310543e13ea))
* tests use debug settings ([#5567](https://github.com/Agoric/agoric-sdk/issues/5567)) ([83d751f](https://github.com/Agoric/agoric-sdk/commit/83d751fb3dd8d47942fc69cfde863e6b21f1b04e))



## [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.12.0...@agoric/xsnap@0.13.0) (2022-05-28)


### Features

* **vaultManager:** expose liquidation metrics ([#5393](https://github.com/Agoric/agoric-sdk/issues/5393)) ([47d4823](https://github.com/Agoric/agoric-sdk/commit/47d48236ee1702d8b0a903e39143132b56cfd096))


### Bug Fixes

* **xsnap:** Regarding unhandled exceptions ([29f7d93](https://github.com/Agoric/agoric-sdk/commit/29f7d9398be8f01447aa3083c6956242a6e3a54f))
* **xsnap:** trace should not overwrite existing files ([5ab59a9](https://github.com/Agoric/agoric-sdk/commit/5ab59a9c6671a5aa6a81ad6a736fb95a3cf3c64b))
* **xsnap:** Use mxNoConsole=1 ([a592439](https://github.com/Agoric/agoric-sdk/commit/a592439b4c5680fa4a81138571e769cae888a587))



## [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.11.2...@agoric/xsnap@0.12.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* **xsnap:** METER_TYPE -> 13

### Features

* **object-inspect:** group bigint digits in threes ([a21d3b4](https://github.com/Agoric/agoric-sdk/commit/a21d3b4d0e12ecd761ba8ec00296df4a42a80c51))
* **xsnap:** load object-inspect in its own Compartment ([05ceb87](https://github.com/Agoric/agoric-sdk/commit/05ceb873f91a926b344a7be53814345b4aa64cc0))
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)


### Bug Fixes

* **xsnap:** adopt `src/object-inspect.js` ([4f23da2](https://github.com/Agoric/agoric-sdk/commit/4f23da29ae19eefb786bb810e44d7b534de91664))
* **xsnap:** METER_TYPE -> 13 ([ae8d18f](https://github.com/Agoric/agoric-sdk/commit/ae8d18f76e6463ef7c41d974d28696c66b4dfcb4))



### [0.11.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.11.1...@agoric/xsnap@0.11.2) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



### [0.11.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.11.0...@agoric/xsnap@0.11.1) (2022-02-21)


### Features

* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* **xsnap:** Lint followup ([4ef61f7](https://github.com/Agoric/agoric-sdk/commit/4ef61f723166ff1439d97eacc4ba8181f14323f5))
* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **xsnap:** Pin xsnap moddable submodule for textencoder ([de8604c](https://github.com/Agoric/agoric-sdk/commit/de8604c1bcd0b7e632500479d4083cbcbb1480ea))
* **xsnap:** Run tests with eventual-send JavaScript ([fc6f0a5](https://github.com/Agoric/agoric-sdk/commit/fc6f0a503256c0a20dc9a1750be80ef27a9d4f6a))
* **xsnap:** use `object-inspect` to render `print` output better ([3c3a353](https://github.com/Agoric/agoric-sdk/commit/3c3a353bb67b8b623e5b931632d28d96a535f215))



## [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.10.0...@agoric/xsnap@0.11.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* METER_TYPE -> xs-meter-12

  - update metering tests

### Features

* expose XS the->currentHeapCount to metering/delivery results ([a031d79](https://github.com/Agoric/agoric-sdk/commit/a031d7900440ee3717c15e7c5be4ae8226ef5530)), closes [#3910](https://github.com/Agoric/agoric-sdk/issues/3910)


### Bug Fixes

* have main entry points use `@endo/init`, not `ses` ([dce92ac](https://github.com/Agoric/agoric-sdk/commit/dce92acfac4dd0a5de048f7d7865e0e3cdc14396))
* **ava-xs:** allow test file globs as arguments, just like AVA ([3d12770](https://github.com/Agoric/agoric-sdk/commit/3d127708000b017aef1e994f424b566e07d04626))
* **xsnap:** get ordering right so that ses loads before most shims ([80d00bf](https://github.com/Agoric/agoric-sdk/commit/80d00bf9046d2b0f23a2a509a6a8a127b613d802))



## [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.9.1...@agoric/xsnap@0.10.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* **xsnap:** upgrade XS to fix memory leak

### Bug Fixes

* **xsnap:** upgrade XS to fix memory leak ([9a70831](https://github.com/Agoric/agoric-sdk/commit/9a70831cbc02edea7721b9a521492c030b097f2c)), closes [#3839](https://github.com/Agoric/agoric-sdk/issues/3839) [#3877](https://github.com/Agoric/agoric-sdk/issues/3877) [#3889](https://github.com/Agoric/agoric-sdk/issues/3889)
* **xsnap:** work around stricter TS checking of globalThis ([942ae90](https://github.com/Agoric/agoric-sdk/commit/942ae905454a87a1739b14b49609eaeddebffcde))



### [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.9.0...@agoric/xsnap@0.9.1) (2021-09-23)


### Bug Fixes

* **xsnap:** format objects nicely in console using SES assert.quote ([#3856](https://github.com/Agoric/agoric-sdk/issues/3856)) ([a3306d0](https://github.com/Agoric/agoric-sdk/commit/a3306d01d8e87c4bc7483a61e42cc30b006feb81)), closes [#3844](https://github.com/Agoric/agoric-sdk/issues/3844)



## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.8.2...@agoric/xsnap@0.9.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* **xsnap:** moddable resync for stack-trace changes metering

### Features

* **xsnap:** Add base 64 bindings ([a8279a4](https://github.com/Agoric/agoric-sdk/commit/a8279a43ef6f4686efba301fe2cb93e1d4e9b156))
* **xsnap:** integrate native TextEncoder / TextDecoder ([9d65dbe](https://github.com/Agoric/agoric-sdk/commit/9d65dbe2410e1856c3ac1fa6ff7eb921bb24ec0c))


### Bug Fixes

* **xsnap:** moddable resync for stack-trace changes metering ([34e5e18](https://github.com/Agoric/agoric-sdk/commit/34e5e1877eb74cf39fc32cf1cc53524c3f365635))
* **xsnap:** supply missing file, line numbers based on sourceURL ([be3386c](https://github.com/Agoric/agoric-sdk/commit/be3386cbcd2255c469791830984fc385856226cc)), closes [#2578](https://github.com/Agoric/agoric-sdk/issues/2578)



### [0.8.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.8.1...@agoric/xsnap@0.8.2) (2021-08-18)

**Note:** Version bump only for package @agoric/xsnap





### [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.8.0...@agoric/xsnap@0.8.1) (2021-08-17)


### Bug Fixes

* Remove dregs of node -r esm ([#3710](https://github.com/Agoric/agoric-sdk/issues/3710)) ([e30c934](https://github.com/Agoric/agoric-sdk/commit/e30c934a9de19e930677c7b65ad98abe0be16d56))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.9...@agoric/xsnap@0.8.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **xsnap:** don't rely on diagnostic meters
* **xsnap:** avoid O(n^2) Array, Map, Set growth

### Features

* **xsnap:** make name available on xsnap object ([8c4a16b](https://github.com/Agoric/agoric-sdk/commit/8c4a16bc203722d594f09bf7c5acd09c4209ba1c))
* **xsnap:** record upstream commands as well as replies ([fc9332f](https://github.com/Agoric/agoric-sdk/commit/fc9332fc52f626b884e4998e780dbfbf87cb854d))


### Bug Fixes

* **deployment:** use proper path to build.js ([78d2d73](https://github.com/Agoric/agoric-sdk/commit/78d2d73e33311ee09eaec17fa3b5c4d393a73621))
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)
* **xsnap:** 1st field of `git submodule status` is 1 char ([5448675](https://github.com/Agoric/agoric-sdk/commit/54486754d77bf7d65bcc590146ffce359eef955d))
* **xsnap:** Allow for an absent package.json ava.require ([2d30a11](https://github.com/Agoric/agoric-sdk/commit/2d30a11de0e1a8f167aa033af40dd34309bf65d5))
* **xsnap:** avoid O(n^2) Array, Map, Set growth ([11e7c1c](https://github.com/Agoric/agoric-sdk/commit/11e7c1cdbc12a0a53477be3e81cf86cc6407cd28)), closes [#3012](https://github.com/Agoric/agoric-sdk/issues/3012)
* **xsnap:** build needs to await checkout ([a2f4861](https://github.com/Agoric/agoric-sdk/commit/a2f4861b3e1469f26baae8ce9326068f9d513195))
* **xsnap:** don't rely on diagnostic meters ([8148c13](https://github.com/Agoric/agoric-sdk/commit/8148c13c5f4810c5fe92e05ced57ebf56302404d))
* **xsnap:** tolerate Symbols in console.log() arguments ([#3618](https://github.com/Agoric/agoric-sdk/issues/3618)) ([314ee93](https://github.com/Agoric/agoric-sdk/commit/314ee93ee8fc5e97e8c40a640b94ffa770a046bc))

### 0.26.10 (2021-07-28)


### Features

* **xsnap:** FFI to enable/disable metering ([#3480](https://github.com/Agoric/agoric-sdk/issues/3480)) ([94d9417](https://github.com/Agoric/agoric-sdk/commit/94d941707583a4c145ace144cf82bedc330979a3)), closes [#3457](https://github.com/Agoric/agoric-sdk/issues/3457)


### Bug Fixes

* tolerate endo pre and post [#822](https://github.com/Agoric/agoric-sdk/issues/822) ([#3472](https://github.com/Agoric/agoric-sdk/issues/3472)) ([e872c0c](https://github.com/Agoric/agoric-sdk/commit/e872c0c77a146a746066de583021d8c9f1721b93))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.9...@agoric/xsnap@0.7.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **xsnap:** don't rely on diagnostic meters
* **xsnap:** avoid O(n^2) Array, Map, Set growth

### Features

* **xsnap:** make name available on xsnap object ([8c4a16b](https://github.com/Agoric/agoric-sdk/commit/8c4a16bc203722d594f09bf7c5acd09c4209ba1c))
* **xsnap:** record upstream commands as well as replies ([fc9332f](https://github.com/Agoric/agoric-sdk/commit/fc9332fc52f626b884e4998e780dbfbf87cb854d))


### Bug Fixes

* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)
* **xsnap:** Allow for an absent package.json ava.require ([2d30a11](https://github.com/Agoric/agoric-sdk/commit/2d30a11de0e1a8f167aa033af40dd34309bf65d5))
* **xsnap:** avoid O(n^2) Array, Map, Set growth ([11e7c1c](https://github.com/Agoric/agoric-sdk/commit/11e7c1cdbc12a0a53477be3e81cf86cc6407cd28)), closes [#3012](https://github.com/Agoric/agoric-sdk/issues/3012)
* **xsnap:** don't rely on diagnostic meters ([8148c13](https://github.com/Agoric/agoric-sdk/commit/8148c13c5f4810c5fe92e05ced57ebf56302404d))
* **xsnap:** tolerate Symbols in console.log() arguments ([#3618](https://github.com/Agoric/agoric-sdk/issues/3618)) ([314ee93](https://github.com/Agoric/agoric-sdk/commit/314ee93ee8fc5e97e8c40a640b94ffa770a046bc))

### 0.26.10 (2021-07-28)


### Features

* **xsnap:** FFI to enable/disable metering ([#3480](https://github.com/Agoric/agoric-sdk/issues/3480)) ([94d9417](https://github.com/Agoric/agoric-sdk/commit/94d941707583a4c145ace144cf82bedc330979a3)), closes [#3457](https://github.com/Agoric/agoric-sdk/issues/3457)


### Bug Fixes

* tolerate endo pre and post [#822](https://github.com/Agoric/agoric-sdk/issues/822) ([#3472](https://github.com/Agoric/agoric-sdk/issues/3472)) ([e872c0c](https://github.com/Agoric/agoric-sdk/commit/e872c0c77a146a746066de583021d8c9f1721b93))



### [0.6.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.9...@agoric/xsnap@0.6.10) (2021-07-28)


### Features

* **xsnap:** FFI to enable/disable metering ([#3480](https://github.com/Agoric/agoric-sdk/issues/3480)) ([94d9417](https://github.com/Agoric/agoric-sdk/commit/94d941707583a4c145ace144cf82bedc330979a3)), closes [#3457](https://github.com/Agoric/agoric-sdk/issues/3457)


### Bug Fixes

* tolerate endo pre and post [#822](https://github.com/Agoric/agoric-sdk/issues/822) ([#3472](https://github.com/Agoric/agoric-sdk/issues/3472)) ([e872c0c](https://github.com/Agoric/agoric-sdk/commit/e872c0c77a146a746066de583021d8c9f1721b93))



### [0.6.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.8...@agoric/xsnap@0.6.9) (2021-07-01)


### Features

* **xsnap:** isReady() eliminates need for .evaluate('null') ([a0493d7](https://github.com/Agoric/agoric-sdk/commit/a0493d7c34c66d008e295ac2b0b86e312a36b5da))



### [0.6.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.7...@agoric/xsnap@0.6.8) (2021-06-28)


### Features

* demand-paged vats are reloaded from heap snapshots ([#2848](https://github.com/Agoric/agoric-sdk/issues/2848)) ([cb239cb](https://github.com/Agoric/agoric-sdk/commit/cb239cbb27943ad58c304d85ee9b61ba917af79c)), closes [#2273](https://github.com/Agoric/agoric-sdk/issues/2273) [#2277](https://github.com/Agoric/agoric-sdk/issues/2277) [#2422](https://github.com/Agoric/agoric-sdk/issues/2422)


### Bug Fixes

* snapStore tmp files were kept for debugging ([#3420](https://github.com/Agoric/agoric-sdk/issues/3420)) ([9d9560d](https://github.com/Agoric/agoric-sdk/commit/9d9560db488b67c8dfbc8dbba23967d5059dd071))



### [0.6.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.6...@agoric/xsnap@0.6.7) (2021-06-25)


### Bug Fixes

* **xsnap:** update XS: new WeakMap design, fixed Promise drops ([8eeec28](https://github.com/Agoric/agoric-sdk/commit/8eeec2808ee7596d0b08a362d182c65a8828fba3)), closes [#3406](https://github.com/Agoric/agoric-sdk/issues/3406) [#3118](https://github.com/Agoric/agoric-sdk/issues/3118)



### [0.6.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.5...@agoric/xsnap@0.6.6) (2021-06-24)

**Note:** Version bump only for package @agoric/xsnap





### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.4...@agoric/xsnap@0.6.5) (2021-06-23)


### Features

* **xsnap:** record / replay xsnap protcol ([616a752](https://github.com/Agoric/agoric-sdk/commit/616a752289d87ae71fd21a0f9533b158667d2d89))


### Bug Fixes

* **xsnap:** 1e7 was too small for crank meter limit ([95c52ab](https://github.com/Agoric/agoric-sdk/commit/95c52ab62f7be855d084b70626b67e8ca516714f))
* **xsnap:** Account for TypedArray and subarrays in Text shim ([3531132](https://github.com/Agoric/agoric-sdk/commit/35311325cdb76c4981cffaffbc9d9b1f8701662a))
* **xsnap:** don't risk NULL in gxSnapshotCallbacks ([3a6ddbb](https://github.com/Agoric/agoric-sdk/commit/3a6ddbb4b2ab1ab551888ad7e4ec86d32189caf0))
* **xsnap:** fxMeterHostFunction is no more ([67e6a51](https://github.com/Agoric/agoric-sdk/commit/67e6a512d5c16ec32734e2fb4c046182142b85a0))



### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.3...@agoric/xsnap@0.6.4) (2021-06-16)

**Note:** Version bump only for package @agoric/xsnap





### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.2...@agoric/xsnap@0.6.3) (2021-06-15)


### Features

* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric-sdk/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))
* **xsnap:** add gcAndFinalize, tests ([343d908](https://github.com/Agoric/agoric-sdk/commit/343d9081b84205902e47e4f4f4fef3b97e6dfe45)), closes [#2660](https://github.com/Agoric/agoric-sdk/issues/2660)
* **xsnap:** refined metering: stack, arrays ([9c48919](https://github.com/Agoric/agoric-sdk/commit/9c4891948c0ba3e8edc564035ad16a949e8b6bd0))


### Bug Fixes

* be more explicit when gc() is not enabled, but not repetitive ([b3f7757](https://github.com/Agoric/agoric-sdk/commit/b3f775704a2a9373623d3c6f24726e14ec8d0056))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))
* **xs-worker:** respect !managerOptions.metered ([#3078](https://github.com/Agoric/agoric-sdk/issues/3078)) ([84fa8c9](https://github.com/Agoric/agoric-sdk/commit/84fa8c984bc0bccb2482007d69dfb01773de6c74))
* **xsnap:** free netstring in issueCommand() ([127e58a](https://github.com/Agoric/agoric-sdk/commit/127e58ac45bc9ea316733bbe6790936ba1b28f56))
* **xsnap:** handle malloc() failure ([67d2581](https://github.com/Agoric/agoric-sdk/commit/67d25812985ce590cda10e2774be885b16fa67fb))



## [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.1...@agoric/xsnap@0.6.2) (2021-05-10)

**Note:** Version bump only for package @agoric/xsnap





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.6.0...@agoric/xsnap@0.6.1) (2021-05-05)


### Bug Fixes

* cope with getting moddable submodule from agoric-labs ([a1a2693](https://github.com/Agoric/agoric-sdk/commit/a1a26931d17ade84ae97aa3a9d0e7c5c58a74491))





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.5...@agoric/xsnap@0.6.0) (2021-05-05)


### Bug Fixes

* **xsnap:** fix the xsnap/moddable git-submodule ([fc34fba](https://github.com/Agoric/agoric-sdk/commit/fc34fba9d28776bd5120831864ef12f71e120766))
* **xsnap:** start with expected heap (32MB) and grow by 4MB ([2e59868](https://github.com/Agoric/agoric-sdk/commit/2e598684ca009d9575fbe078205396eaf89d06e8))
* ignore an xsnap build output ([#2887](https://github.com/Agoric/agoric-sdk/issues/2887)) ([646b621](https://github.com/Agoric/agoric-sdk/commit/646b6211618381fe569a2be0820137523a484a6e))


### Features

* **ava-xs:** provide test script name to xsnap ([05f0637](https://github.com/Agoric/agoric-sdk/commit/05f0637942586b449e516796f1f9881fe218d08c))
* **xsnap:** $XSNAP_DEBUG_RR for time-travel debugging ([bd4af92](https://github.com/Agoric/agoric-sdk/commit/bd4af925c73ac33e027027f5e56bc65c4c10a38a))
* **xsnap:** define XSnapOptions type ([1ce5618](https://github.com/Agoric/agoric-sdk/commit/1ce561892e4d1bfb91e8dc6491e1229713619967))
* **xsnap:** grow heap more slowly ([11795de](https://github.com/Agoric/agoric-sdk/commit/11795deeec15afda3ea96ed8a994243480f97a69))
* **xsnap:** high resolution timer: performance.now() ([10940f9](https://github.com/Agoric/agoric-sdk/commit/10940f902fef4a47a5fd8b63faeceb9c5c0be4eb))
* **xsnap:** increase allocation limit to 2GB ([5922cbd](https://github.com/Agoric/agoric-sdk/commit/5922cbdd360a29acaac4fbe00d298b0af8e5e8a4))
* **xsnap:** meter add/remove on map, set ([327062f](https://github.com/Agoric/agoric-sdk/commit/327062f9f9843ed2f4d8d6e0fa2445d1fa4fdf55))
* **xsnap:** meter allocation ([eecd58d](https://github.com/Agoric/agoric-sdk/commit/eecd58d503904e0aff24e6850730b165eeac1c9e))
* **xsnap:** meter calls to allocateChunks, allocateSlots ([5a35842](https://github.com/Agoric/agoric-sdk/commit/5a35842cca71433f7dd2a52cc2750df53a01b269))
* **xsnap:** meter garbageCollectionCount ([f649ff7](https://github.com/Agoric/agoric-sdk/commit/f649ff7715700a5cf3002fcc332692e2786d9d53))
* **xsnap:** meter maxBucketSize ([eff98b4](https://github.com/Agoric/agoric-sdk/commit/eff98b4770a4742cb0b9b2d5bc2de1266d38951b))
* **xsnap:** specify exit codes for meter exhaustion etc. ([db3daaa](https://github.com/Agoric/agoric-sdk/commit/db3daaaeeef1ac81104b8a58922da932ccdbadd9))
* refcount-based promise GC in the comms vat ([209b034](https://github.com/Agoric/agoric-sdk/commit/209b034f196d46f5d6b499f8b0bf32dbddca1114))





## [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.4...@agoric/xsnap@0.5.5) (2021-04-22)

**Note:** Version bump only for package @agoric/xsnap





## [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.3...@agoric/xsnap@0.5.4) (2021-04-18)

**Note:** Version bump only for package @agoric/xsnap





## [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.2...@agoric/xsnap@0.5.3) (2021-04-16)

**Note:** Version bump only for package @agoric/xsnap





## [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.1...@agoric/xsnap@0.5.2) (2021-04-14)

**Note:** Version bump only for package @agoric/xsnap





## [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.5.0...@agoric/xsnap@0.5.1) (2021-04-07)

**Note:** Version bump only for package @agoric/xsnap





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.4.0...@agoric/xsnap@0.5.0) (2021-04-06)


### Bug Fixes

* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))


### Features

* **xsnap:** show name on command line ([5b31c23](https://github.com/Agoric/agoric-sdk/commit/5b31c230f81f9e25a53a478de8a66a2f3acfa822))
* **xsnap:** snapstore with compressed snapshots ([865ba54](https://github.com/Agoric/agoric-sdk/commit/865ba5472b5f43563948f7afe63e85bcc4014888))





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.3.0...@agoric/xsnap@0.4.0) (2021-03-24)


### Bug Fixes

* rename crankStats -> meterUsage ([e0fa380](https://github.com/Agoric/agoric-sdk/commit/e0fa380220a9b0bbc555e55c1d6481c9e48add9b))


### Features

* **xsnap:** enable gc() in the start compartment ([e407fa2](https://github.com/Agoric/agoric-sdk/commit/e407fa2393dfc8b06111d5353123afd92cd6cab6)), closes [#2682](https://github.com/Agoric/agoric-sdk/issues/2682) [#2660](https://github.com/Agoric/agoric-sdk/issues/2660) [#2615](https://github.com/Agoric/agoric-sdk/issues/2615)





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.2.1...@agoric/xsnap@0.3.0) (2021-03-16)


### Bug Fixes

* **ava-xs:** anchor match patterns ([c753779](https://github.com/Agoric/agoric-sdk/commit/c7537799e7feb868fcfe6d916fab626244519d32))
* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* properly pin the Moddable SDK version ([58333e0](https://github.com/Agoric/agoric-sdk/commit/58333e069192267fc96e30bb5272edc03b3faa04))
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))
* use git submodule update --init --checkout ([fd3965d](https://github.com/Agoric/agoric-sdk/commit/fd3965de6e578000975fa7cb521689f1872140d2))
* **avaXS:** notDeepEqual confused false with throwing ([a1b7460](https://github.com/Agoric/agoric-sdk/commit/a1b74604a63b89dc499e58e72b8425effae0b809))
* **xsnap:** bounds checking in release builds ([c36f040](https://github.com/Agoric/agoric-sdk/commit/c36f04064ddb7c02bee78a1a07c0fe1fcd4b46d3))
* **xsnap:** freeze API surface ([8c2cc63](https://github.com/Agoric/agoric-sdk/commit/8c2cc63acb78f8a169c53804d64304e8e954f7df))
* **xsnap:** orderly fail-stop on heap exhaustion ([8ffbaa6](https://github.com/Agoric/agoric-sdk/commit/8ffbaa64bf48a63c34fac3245d117a8a6fa6731a))
* **xsnap:** shim HandledPromise before lockdown() ([7e8178a](https://github.com/Agoric/agoric-sdk/commit/7e8178aa4ed8bf300a9e20d46e0c6a51848160d7))
* **xsrepl:** pass command line args thru shell wrapper ([7679200](https://github.com/Agoric/agoric-sdk/commit/7679200fa6b37ec832d72d2662d6f098d4989f37))


### Features

* **ava-xs:** -m title match support ([e89f1e1](https://github.com/Agoric/agoric-sdk/commit/e89f1e1b716b38f9762d4fef914135c4b0078ced))
* **ava-xs:** handle some zoe tests ([#2573](https://github.com/Agoric/agoric-sdk/issues/2573)) ([7789834](https://github.com/Agoric/agoric-sdk/commit/7789834f7d232e395a707c5117295b768ed3fcff)), closes [#2503](https://github.com/Agoric/agoric-sdk/issues/2503)
* **xsnap:** ava work-alike ([2c71b4a](https://github.com/Agoric/agoric-sdk/commit/2c71b4a96b246bcbf89ba1bbb4a44737babccba9))
* **xsnap:** deep stacks work with updated moddable error stacks ([#2579](https://github.com/Agoric/agoric-sdk/issues/2579)) ([6a8fc76](https://github.com/Agoric/agoric-sdk/commit/6a8fc7646eeab48b176b44ebaca115ed9afa7966))
* **xsnap:** unhandled rejections are debuggable ([cbf83be](https://github.com/Agoric/agoric-sdk/commit/cbf83beffbbb57d49a9d945b1b1d975731d4f293))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/xsnap@0.2.0...@agoric/xsnap@0.2.1) (2021-02-22)


### Bug Fixes

* **xsnap:** lib directory was missing from package files ([5bd8eb8](https://github.com/Agoric/agoric-sdk/commit/5bd8eb848a348877c1674fd8ce55bbc1ae37986a))





# 0.2.0 (2021-02-16)


### Bug Fixes

* **xsnap:** Typo in README re order of REPL ops ([#2188](https://github.com/Agoric/agoric-sdk/issues/2188)) ([18b0cac](https://github.com/Agoric/agoric-sdk/commit/18b0cac663c1a822417b43b3fb2f2c8173fd10a1))
* cleanups and simplifications ([1fe4eae](https://github.com/Agoric/agoric-sdk/commit/1fe4eae27cbe6e97b5f905d921d3e72d167cd108))
* complain if metering is requested but not compiled in ([857d4ba](https://github.com/Agoric/agoric-sdk/commit/857d4ba44eb93fc4f07608255232ca8c2ede7bc0))
* don't hardcode XSNAP_VERSION; get it from package.json ([b418db5](https://github.com/Agoric/agoric-sdk/commit/b418db5773f40c695988b27149612835e75fcd44))
* git should ignore xsnap/dist ([#2312](https://github.com/Agoric/agoric-sdk/issues/2312)) ([097f734](https://github.com/Agoric/agoric-sdk/commit/097f734abd3209ff55d0e78321efb1e0b160af20))
* missing console methods ([#2254](https://github.com/Agoric/agoric-sdk/issues/2254)) ([79e81b0](https://github.com/Agoric/agoric-sdk/commit/79e81b014ea6e3df1a98ef0d35e7cad2d1d966a6))
* reenable Docker builds and deployment ([559ea06](https://github.com/Agoric/agoric-sdk/commit/559ea062251d73e3a6921c85f63631a50ddfad35))
* **xsnap:** Iron out resolution types ([1e2e10d](https://github.com/Agoric/agoric-sdk/commit/1e2e10d78b8e57df6e5eb9ea8f81ba4ded2de8b4))
* **xsnap:** Make xsrepl executable ([#2197](https://github.com/Agoric/agoric-sdk/issues/2197)) ([bd7d738](https://github.com/Agoric/agoric-sdk/commit/bd7d738010e84db7bfbbf13bc7af1e3787243e7c))
* **xsnap:** This is not a smog check ([#2190](https://github.com/Agoric/agoric-sdk/issues/2190)) ([437814c](https://github.com/Agoric/agoric-sdk/commit/437814cf6dc78ecb7ee878e574f121b29a1e761f))
* **xsnap:** Thread spawn and os into xsnap ([619a4de](https://github.com/Agoric/agoric-sdk/commit/619a4dee82a1e63d6b6708dcbb102fa2aced676e))
* **xsnap:** Update submodules for build and use CURDIR ([#2186](https://github.com/Agoric/agoric-sdk/issues/2186)) ([d0bf5cb](https://github.com/Agoric/agoric-sdk/commit/d0bf5cb4394f0d542020863e72c3eeacd705c3d7))


### Features

* use xsnap worker CPU meter and start reporting consumption ([62e0d5a](https://github.com/Agoric/agoric-sdk/commit/62e0d5a3b5ff32bd79567bab8fa1b63eb7f9134a))
* **swingset:** defaultManagerType option in makeSwingsetController ([#2266](https://github.com/Agoric/agoric-sdk/issues/2266)) ([b57f08f](https://github.com/Agoric/agoric-sdk/commit/b57f08f3514e052126a758f949acb5db3cc5a32d)), closes [#2260](https://github.com/Agoric/agoric-sdk/issues/2260)
* **swingset:** xsnap vat worker ([#2225](https://github.com/Agoric/agoric-sdk/issues/2225)) ([50c8548](https://github.com/Agoric/agoric-sdk/commit/50c8548e4d610e1e32537bc155e4c58d917cd6df)), closes [#2216](https://github.com/Agoric/agoric-sdk/issues/2216) [#2202](https://github.com/Agoric/agoric-sdk/issues/2202)
* **xs-vat-worker:** bootstrap SES shim on xsnap ([e775a99](https://github.com/Agoric/agoric-sdk/commit/e775a99afae43a8581cdeedd22545c7fa703c691))
* **xsnap:** Add interactive mode ([42912a7](https://github.com/Agoric/agoric-sdk/commit/42912a7c1d70cb67248f54f43b600165dbe7f624))
* **xsnap:** Add machinery for an xsrepl binary ([#2187](https://github.com/Agoric/agoric-sdk/issues/2187)) ([fc560d5](https://github.com/Agoric/agoric-sdk/commit/fc560d5ef9f77d85becd3c27edd820695900491f))
* **xsnap:** Add Node.js shell ([4491145](https://github.com/Agoric/agoric-sdk/commit/4491145cac1ab1d1a15b5b4b61a1c5a0cb975736))
* **xsnap:** Initial checkin from 34dfa4a ([f083df0](https://github.com/Agoric/agoric-sdk/commit/f083df0b791450eb28c2e43a69e3436f4b38d722))
* **xsnap:** Pivot terms from syscalls to commands ([3576b5c](https://github.com/Agoric/agoric-sdk/commit/3576b5cbd25c2dcbf0e94d5865c8b39e2cf2a1c7))
