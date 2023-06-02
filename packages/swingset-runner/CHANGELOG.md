# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.22.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.22.1...@agoric/swingset-runner@0.22.2) (2023-06-02)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.22.0...@agoric/swingset-runner@0.22.1) (2023-05-24)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.21.2...@agoric/swingset-runner@0.22.0) (2023-05-19)


### Features

* add APIs for tracking/debugging undesired object retention (aka "leaks") ([0a7221b](https://github.com/Agoric/agoric-sdk/commit/0a7221b3c04f3b2894c30346fa2ea6fb0130c046)), closes [#7318](https://github.com/Agoric/agoric-sdk/issues/7318)
* convert swing-store from LMDB to Sqlite ([579a6c7](https://github.com/Agoric/agoric-sdk/commit/579a6c796a47092c4ee880316c7530d07d92c961))
* Convert SwingSet to use smallcaps encoding for serialized data ([f289ec0](https://github.com/Agoric/agoric-sdk/commit/f289ec0868bf66ab3d48b32e5933ef12aa3a9edc)), closes [#6326](https://github.com/Agoric/agoric-sdk/issues/6326)
* implement swingStore data export/import in support of state sync ([268e62f](https://github.com/Agoric/agoric-sdk/commit/268e62f8d68063de6416042ac1a8b94df89f3399)), closes [#6773](https://github.com/Agoric/agoric-sdk/issues/6773)
* refactor SwingStore APIs to cleanly distinguish kernel facet from host facet ([7126822](https://github.com/Agoric/agoric-sdk/commit/71268220d659469cd583c9c510ed8c1a1661f282))


### Bug Fixes

* **swingset-runner:** Revert hard dep on canvas ([fff17fd](https://github.com/Agoric/agoric-sdk/commit/fff17fdbf25c85c2e8b86508a736d9860dc44727))
* **swingset-runner:** Satisfy peer dependency of stat-logger with a dev dependency on canvas ([0f660a6](https://github.com/Agoric/agoric-sdk/commit/0f660a68054e031b875621654e1efca66b816d52))
* **telemetry:** Missing after-commit rename from [#6881](https://github.com/Agoric/agoric-sdk/issues/6881) ([8e211f8](https://github.com/Agoric/agoric-sdk/commit/8e211f8862dea52b1d952c51760d6690a7604d30))
* **zoe:** payments more recoverable ([#7112](https://github.com/Agoric/agoric-sdk/issues/7112)) ([ce7244d](https://github.com/Agoric/agoric-sdk/commit/ce7244d6cf23f57e6de73b5d119e9681456fded7))
* CI failures in other packages ([071bf89](https://github.com/Agoric/agoric-sdk/commit/071bf89a337f39b3cb73ef60649fbe47825806bc))



### [0.21.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.21.3...@agoric/swingset-runner@0.21.4) (2023-02-17)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.21.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.21.2...@agoric/swingset-runner@0.21.3) (2022-12-14)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.21.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.21.1...@agoric/swingset-runner@0.21.2) (2022-10-18)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.21.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.21.0...@agoric/swingset-runner@0.21.1) (2022-10-08)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.21.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.20.0...@agoric/swingset-runner@0.21.0) (2022-10-05)


### Features

* add otel telemetry feed option to swingset-runner ([b732457](https://github.com/Agoric/agoric-sdk/commit/b73245772e5e9a5eae6b9410355d1264d257c850)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)


### Bug Fixes

* add kernel stats as a slog entry at completion of each block ([8a38c52](https://github.com/Agoric/agoric-sdk/commit/8a38c52a0a4eb665e03fdba7c96e944221ab8bc9)), closes [#4585](https://github.com/Agoric/agoric-sdk/issues/4585)



## [0.20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.19.2...@agoric/swingset-runner@0.20.0) (2022-09-20)


### Features

* **swing-store:** Switch to lmdb-js ([89adc87](https://github.com/Agoric/agoric-sdk/commit/89adc87848494e78213d68194357c876b9ae4cf0))
* allow vats to be marked critical and panic the kernel if a critical vat fails ([9ef4941](https://github.com/Agoric/agoric-sdk/commit/9ef49412b27fc73e3d63bba7bda7a0ee2a387f41)), closes [#4279](https://github.com/Agoric/agoric-sdk/issues/4279)


### Bug Fixes

* lint warning cleanup ([2184da3](https://github.com/Agoric/agoric-sdk/commit/2184da353b0ee213ec3cb435271397c3d63d682a)), closes [#5734](https://github.com/Agoric/agoric-sdk/issues/5734)
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))



### [0.19.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.19.1...@agoric/swingset-runner@0.19.2) (2022-05-28)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.19.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.19.0...@agoric/swingset-runner@0.19.1) (2022-05-09)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.19.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.18.3...@agoric/swingset-runner@0.19.0) (2022-04-18)


### Features

* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
* **swingset-runner:** add option to dump out the activityhash after each crank ([5a248ab](https://github.com/Agoric/agoric-sdk/commit/5a248ab152dddb09989e1dd9f54f3bb16177616b))
* **swingset-runner:** folloup to also include step mode in activityhash output ([ce7387f](https://github.com/Agoric/agoric-sdk/commit/ce7387f8de8d3a5d6d4c0854c050dfc40c1648e3))


### Bug Fixes

* **swingset-runner:** update swingset deep-import paths ([1a251f3](https://github.com/Agoric/agoric-sdk/commit/1a251f3fe3592e88bc38eac1e153133bf8d5e17d))
* **swingset-runner:** update tests copied from zoe ([5a20a2a](https://github.com/Agoric/agoric-sdk/commit/5a20a2a1656af2f90adfa010f6f8c508fddd3dab))



### [0.18.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.18.2...@agoric/swingset-runner@0.18.3) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



### [0.18.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.18.1...@agoric/swingset-runner@0.18.2) (2022-02-21)


### Features

* add --wide option to kerneldump utility ([749c801](https://github.com/Agoric/agoric-sdk/commit/749c801e8d0bcb5f1d14741328a2d25a71cc33fa))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))



### [0.18.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.18.0...@agoric/swingset-runner@0.18.1) (2021-12-22)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.18.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.17.2...@agoric/swingset-runner@0.18.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Features

* implement Bring Out Your Dead as a kernel-driven operation ([a1310e0](https://github.com/Agoric/agoric-sdk/commit/a1310e0f51348f8d6c7f4d7281f96cbe8e72b134))


### Bug Fixes

* **deps:** remove explicit `@agoric/babel-standalone` ([4f22453](https://github.com/Agoric/agoric-sdk/commit/4f22453a6f2de1a2c27ae8ad0d11b13116890dab))
* prune metering rewrite from swingset-runner ([d42043f](https://github.com/Agoric/agoric-sdk/commit/d42043fd79ab5c982e8188d4b1409bfdf4038ed8))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.17.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.17.1...@agoric/swingset-runner@0.17.2) (2021-10-13)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.17.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.17.0...@agoric/swingset-runner@0.17.1) (2021-09-23)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.17.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.16.1...@agoric/swingset-runner@0.17.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* clean up organization of swing-store

### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))


### Code Refactoring

* clean up organization of swing-store ([3c7e57b](https://github.com/Agoric/agoric-sdk/commit/3c7e57b8f62c0b93660dd57c002ffb96c2cd4137))



### [0.16.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.16.0...@agoric/swingset-runner@0.16.1) (2021-08-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.16.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.15.1...@agoric/swingset-runner@0.16.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Bug Fixes

* Remove superfluous -S for env in shebangs ([0b897ab](https://github.com/Agoric/agoric-sdk/commit/0b897ab04941ce1b690459e3386fd2c02d860f45))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.15.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.15.0...@agoric/swingset-runner@0.15.1) (2021-08-16)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.15.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.10...@agoric/swingset-runner@0.15.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Bug Fixes

* Add zcf extensions ([862aefe](https://github.com/Agoric/agoric-sdk/commit/862aefe17d0637114aee017be79a84dbcacad48d))
* newly missing fars ([#3557](https://github.com/Agoric/agoric-sdk/issues/3557)) ([32069cc](https://github.com/Agoric/agoric-sdk/commit/32069cc20e4e408cbc0c1881f36b44a3b9d24730))


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* add command line flag to use XS ([66b5a5e](https://github.com/Agoric/agoric-sdk/commit/66b5a5e43c1b70124de17d971a434a11c7ebc8a3))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* update slogulator for GC syscalls and deliveries ([207d8d9](https://github.com/Agoric/agoric-sdk/commit/207d8d9583549b755903c7329e61518d17c763d6))


### Bug Fixes

* **swingset-runner:** remove --meter controls ([cc1d3c5](https://github.com/Agoric/agoric-sdk/commit/cc1d3c5604cf848a69ef55e61662c6094d5ff341))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



## [0.14.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.10...@agoric/swingset-runner@0.14.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Bug Fixes

* Add zcf extensions ([862aefe](https://github.com/Agoric/agoric-sdk/commit/862aefe17d0637114aee017be79a84dbcacad48d))
* newly missing fars ([#3557](https://github.com/Agoric/agoric-sdk/issues/3557)) ([32069cc](https://github.com/Agoric/agoric-sdk/commit/32069cc20e4e408cbc0c1881f36b44a3b9d24730))


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* add command line flag to use XS ([66b5a5e](https://github.com/Agoric/agoric-sdk/commit/66b5a5e43c1b70124de17d971a434a11c7ebc8a3))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* update slogulator for GC syscalls and deliveries ([207d8d9](https://github.com/Agoric/agoric-sdk/commit/207d8d9583549b755903c7329e61518d17c763d6))


### Bug Fixes

* **swingset-runner:** remove --meter controls ([cc1d3c5](https://github.com/Agoric/agoric-sdk/commit/cc1d3c5604cf848a69ef55e61662c6094d5ff341))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.13.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.10...@agoric/swingset-runner@0.13.11) (2021-07-28)


### Features

* add command line flag to use XS ([66b5a5e](https://github.com/Agoric/agoric-sdk/commit/66b5a5e43c1b70124de17d971a434a11c7ebc8a3))
* audit object refcounts ([d7c9792](https://github.com/Agoric/agoric-sdk/commit/d7c9792597d063fbc8970acb034674b15865de7d)), closes [#3445](https://github.com/Agoric/agoric-sdk/issues/3445)
* refactor object pinning ([9941a08](https://github.com/Agoric/agoric-sdk/commit/9941a086837ad4e6c314da5a6c4faa999430c3f4))
* update slogulator for GC syscalls and deliveries ([207d8d9](https://github.com/Agoric/agoric-sdk/commit/207d8d9583549b755903c7329e61518d17c763d6))


### Bug Fixes

* **swingset-runner:** remove --meter controls ([cc1d3c5](https://github.com/Agoric/agoric-sdk/commit/cc1d3c5604cf848a69ef55e61662c6094d5ff341))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.13.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.9...@agoric/swingset-runner@0.13.10) (2021-07-01)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.8...@agoric/swingset-runner@0.13.9) (2021-06-28)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.7...@agoric/swingset-runner@0.13.8) (2021-06-25)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.6...@agoric/swingset-runner@0.13.7) (2021-06-24)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.5...@agoric/swingset-runner@0.13.6) (2021-06-24)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.4...@agoric/swingset-runner@0.13.5) (2021-06-23)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.3...@agoric/swingset-runner@0.13.4) (2021-06-16)

**Note:** Version bump only for package @agoric/swingset-runner





### [0.13.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.2...@agoric/swingset-runner@0.13.3) (2021-06-15)


### Features

* allow setting of dbsize from swingset-runner command line ([f56df1e](https://github.com/Agoric/agoric-sdk/commit/f56df1eac3c91bdc668a6b8efc455ca0e4e8d212))
* drive loopbox from config instead of command line ([d0388ff](https://github.com/Agoric/agoric-sdk/commit/d0388ff0650e79824cfe0a2f7ad37971a8647c37))
* handle kernel failures more gracefully ([8d03175](https://github.com/Agoric/agoric-sdk/commit/8d0317514bcd00c14762d3d5400e5699332bfd74))
* modify all SwingStore uses to reflect constructor renaming ([9cda6a4](https://github.com/Agoric/agoric-sdk/commit/9cda6a4542bb64d72ddd42d08e2056f5323b18a9))
* move transcripts out of key-value store and into stream stores ([a128e93](https://github.com/Agoric/agoric-sdk/commit/a128e93803344d8a36140d53d3e7711bec5c2511))
* remove .jsonlines hack from simple swing store ([ef87997](https://github.com/Agoric/agoric-sdk/commit/ef87997a1519b18f23656b57bf38055fea203f9a))
* support vats without transcripts, notably the comms vat (to start with) ([18d6050](https://github.com/Agoric/agoric-sdk/commit/18d6050150dae08f03319ca2ffae0fd985e92164)), closes [#3217](https://github.com/Agoric/agoric-sdk/issues/3217)
* update kernel dump to latest schema ([93cb41d](https://github.com/Agoric/agoric-sdk/commit/93cb41dd3a57aef36f7e8f81dce74c9243abf096))
* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric-sdk/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))


### Bug Fixes

* checkpoint db after swingset init ([bf5f46b](https://github.com/Agoric/agoric-sdk/commit/bf5f46b7f8bd38600254bb3b019a1563665123c0))
* make loopbox device compatible with replay ([ce11fff](https://github.com/Agoric/agoric-sdk/commit/ce11fff37da1d1856d4bb6458b08d7ae73267175)), closes [#3260](https://github.com/Agoric/agoric-sdk/issues/3260)
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))
* update dumpstore for new db objects ([b5f6226](https://github.com/Agoric/agoric-sdk/commit/b5f62261eaeb60d5f1a69eff19aaa30d1c5413d1))
* update slogulator to include latest slog entry types ([25d5d43](https://github.com/Agoric/agoric-sdk/commit/25d5d430f2e307b35aa682fad3f811cb417af7a7))



## [0.13.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.1...@agoric/swingset-runner@0.13.2) (2021-05-10)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.13.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.13.0...@agoric/swingset-runner@0.13.1) (2021-05-05)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.13.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.13...@agoric/swingset-runner@0.13.0) (2021-05-05)


### Bug Fixes

* remove deprecated ibid support ([#2898](https://github.com/Agoric/agoric-sdk/issues/2898)) ([f865a2a](https://github.com/Agoric/agoric-sdk/commit/f865a2a8fb5d6cb1d16d9fc21ad4868ea6d5a294)), closes [#2896](https://github.com/Agoric/agoric-sdk/issues/2896) [#2896](https://github.com/Agoric/agoric-sdk/issues/2896) [#2896](https://github.com/Agoric/agoric-sdk/issues/2896)
* update kerneldump to work with SES ([4989fa3](https://github.com/Agoric/agoric-sdk/commit/4989fa35cec68227b4d6bd920f84b6c45c2b761f))


### Features

* refcount-based promise GC in the comms vat ([209b034](https://github.com/Agoric/agoric-sdk/commit/209b034f196d46f5d6b499f8b0bf32dbddca1114))





## [0.12.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.12...@agoric/swingset-runner@0.12.13) (2021-04-22)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.11...@agoric/swingset-runner@0.12.12) (2021-04-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.10...@agoric/swingset-runner@0.12.11) (2021-04-16)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.9...@agoric/swingset-runner@0.12.10) (2021-04-14)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.8...@agoric/swingset-runner@0.12.9) (2021-04-13)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.7...@agoric/swingset-runner@0.12.8) (2021-04-07)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.1...@agoric/swingset-runner@0.12.7) (2021-04-06)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.12.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.12.0...@agoric/swingset-runner@0.12.1) (2021-03-24)


### Bug Fixes

* remove use of Data() from all packages ([540d917](https://github.com/Agoric/agoric-sdk/commit/540d917b20ae74e44752210524f6ffcb27708892)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





# [0.12.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.11.1...@agoric/swingset-runner@0.12.0) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **demo:** make demos robust against bigints in JSON.stringify ([c289502](https://github.com/Agoric/agoric-sdk/commit/c289502a922ce819a2890e3aa36c0fea8ef3b6be))
* clean up the autobench script and prefix the metrics ([adeeb08](https://github.com/Agoric/agoric-sdk/commit/adeeb08b62a69e01e3398b3c5b8a4ecf0735286a))
* don't keep autobench stats for multiple revisions ([dae985d](https://github.com/Agoric/agoric-sdk/commit/dae985d24b27f086da25d7f77c65de51853e693f))
* enable autobench_* metrics ([d06a87b](https://github.com/Agoric/agoric-sdk/commit/d06a87bcb71cf150a5f9a7d383a0fa5d0c2dac69))
* upgrade ses to 0.12.3 to avoid console noise ([#2552](https://github.com/Agoric/agoric-sdk/issues/2552)) ([f59f5f5](https://github.com/Agoric/agoric-sdk/commit/f59f5f58d1567bb11710166b1dbc80f25c39a04f))


### Features

* **autobench:** make metrics more regular; run more benchmarks ([a0ec399](https://github.com/Agoric/agoric-sdk/commit/a0ec3997f05ecc6b30fea8524a6e2742c3a33bf8))
* **autobench:** rewrite in JS ([b4dd503](https://github.com/Agoric/agoric-sdk/commit/b4dd5033db0ccdf88604f31b8924e07a57bee45a))
* push metrics from autobench ([3efc212](https://github.com/Agoric/agoric-sdk/commit/3efc21206ab6693abe94a4b7d2946b50e29983a9))





## [0.11.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.11.0...@agoric/swingset-runner@0.11.1) (2021-02-22)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.11.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.10.0...@agoric/swingset-runner@0.11.0) (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))
* tolerate symbols as property names ([#2094](https://github.com/Agoric/agoric-sdk/issues/2094)) ([15022fe](https://github.com/Agoric/agoric-sdk/commit/15022fe7f3fd3d1fc67687f3b010968725c30a7e))
* use assert rather than FooError constructors ([f860c5b](https://github.com/Agoric/agoric-sdk/commit/f860c5bf5add165a08cb5bd543502857c3f57998))


### Features

* add GitHub action to run post-CI benchmark ([0dc6335](https://github.com/Agoric/agoric-sdk/commit/0dc63357fa166afa2b45a47f8ce284c7fc0d4ef4))
* add support for post-CI automated benchmarking ([2bdd9db](https://github.com/Agoric/agoric-sdk/commit/2bdd9db4d3f553a58b0ca5245d9159fcb5432d80))
* pluralize `resolve` syscall ([6276286](https://github.com/Agoric/agoric-sdk/commit/6276286b5553f13d3cb267c8015f83921a6caf9d))
* promise resolution notification refactoring ([4ffb911](https://github.com/Agoric/agoric-sdk/commit/4ffb91147dbdae971111d7f2fa1e5c9cdc1ae578))
* publish benchmarks stats to GitHub artifact ([cce6d36](https://github.com/Agoric/agoric-sdk/commit/cce6d36a9dd8411b2e1fce2598bfd8725d628438))
* refactor notification and subscription ([dd5f7f7](https://github.com/Agoric/agoric-sdk/commit/dd5f7f7fc5b6ae7f8bee4f123821d92a26581af4))
* slogulator annotation enhancements ([1c09876](https://github.com/Agoric/agoric-sdk/commit/1c09876f8998fabe8021ca24b8e60ae7b27825d2))
* vat-side promise ID retirement ([94e0078](https://github.com/Agoric/agoric-sdk/commit/94e0078673ff15e47c2fcf32f472d27c416a1cd8))





# [0.10.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.9.0...@agoric/swingset-runner@0.10.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))
* The Slogulator Mk I ([42c5fdc](https://github.com/Agoric/agoric-sdk/commit/42c5fdcb78aa058a72db96adce19e8b8e1b7eba7))





# [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.9.0-dev.0...@agoric/swingset-runner@0.9.0) (2020-11-07)


### Bug Fixes

* further cleanup based on reviews ([2e74cc7](https://github.com/Agoric/agoric-sdk/commit/2e74cc72ce1c898b24c1a2613d7864d97fe383c2))
* rework virtual objects implementation to use revised API design ([4c4c1c9](https://github.com/Agoric/agoric-sdk/commit/4c4c1c93f862b3aea990c7c7d556b7c6b949448d))


### Features

* implement virtual objects kept in vat secondary storage ([9f4ae1a](https://github.com/Agoric/agoric-sdk/commit/9f4ae1a4ecda4245291f846149bab6c95c96634c))





# [0.9.0-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.8.0...@agoric/swingset-runner@0.9.0-dev.0) (2020-10-19)


### Features

* split exchange benchmark rounds in two ([94fdfdc](https://github.com/Agoric/agoric-sdk/commit/94fdfdcc7a06b1645e184d9533f8b87c5a80761f))





# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.2...@agoric/swingset-runner@0.8.0) (2020-10-11)


### Bug Fixes

* update swingset runner demos for latest zoe incarnation ([c169ffd](https://github.com/Agoric/agoric-sdk/commit/c169ffd3568d8f4042b10b92da1b8f96fda19a7d))


### Features

* **swingset-runner:** accept '--slog FILE' to write slogfile ([d710582](https://github.com/Agoric/agoric-sdk/commit/d71058289c97b5fee606dc0690f1289b497a5b4f))
* overhaul kernel initialization and startup ([23c3f9d](https://github.com/Agoric/agoric-sdk/commit/23c3f9df56940230e21a16b4861f40197192fdea))
* revamp vat termination API ([aa5b93c](https://github.com/Agoric/agoric-sdk/commit/aa5b93c7ea761bf805206c71bb16e586267db74d))





## [0.7.1-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.1...@agoric/swingset-runner@0.7.1-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.7.1-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.1-dev.0...@agoric/swingset-runner@0.7.1-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.7.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.7.0...@agoric/swingset-runner@0.7.1-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.6.1...@agoric/swingset-runner@0.7.0) (2020-09-16)


### Features

* add swingset-runner bulk demo running tool ([401dcb2](https://github.com/Agoric/agoric-sdk/commit/401dcb228b426b9457e3e77b50fc32c3a330ea61))
* further minor perf instrumentation tweaks ([8e93cd0](https://github.com/Agoric/agoric-sdk/commit/8e93cd01c7d2ffafb3a9282a453d8bed222b0e49))
* properly terminate & clean up after failed vats ([cad2b2e](https://github.com/Agoric/agoric-sdk/commit/cad2b2e45aece7dbc150c40dea194a3fea5dbb69))





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.6.0...@agoric/swingset-runner@0.6.1) (2020-08-31)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.5.0...@agoric/swingset-runner@0.6.0) (2020-08-31)


### Bug Fixes

* clean up review issues ([9ad3b79](https://github.com/Agoric/agoric-sdk/commit/9ad3b79fe59055077ebdba5fcba762038f0f9fb2))
* correct problems that benchmarking turned up ([30f3f87](https://github.com/Agoric/agoric-sdk/commit/30f3f87d4e734b96beaf192f25212dc7d575674d))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* incorporate review feedback ([9812c61](https://github.com/Agoric/agoric-sdk/commit/9812c61ecf489b41769316fb872ee7cc9cc5460f))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* minor fix to zoeTest benchmark ([067dc9b](https://github.com/Agoric/agoric-sdk/commit/067dc9b346ab2ed6a8680eeeef14695679002111))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))


### Features

* augment kernelDump to account for dynamic vat schema additions ([b7dde66](https://github.com/Agoric/agoric-sdk/commit/b7dde669dccfec3c052ee5ca7348ebd7edd2854b))
* clean up after dead vats ([7fa2661](https://github.com/Agoric/agoric-sdk/commit/7fa2661eeddcad36609bf9d755ff1c5b07241f53))
* display kernel objects & promises in numeric order ([c344b41](https://github.com/Agoric/agoric-sdk/commit/c344b41670d4e368131995dda2254a266a2587e4))
* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)
* new iterated Zoe benchmark that uses atomicSwap ([3719907](https://github.com/Agoric/agoric-sdk/commit/3719907e1090af9ad82db2f966c9b523dfb9a55f))
* phase 1 of vat termination: stop talking to or about the vat ([0b1aa20](https://github.com/Agoric/agoric-sdk/commit/0b1aa20630e9c33479d2c4c31a07723819598dab))
* support use of module references in swingset config sourceSpecs ([1c02653](https://github.com/Agoric/agoric-sdk/commit/1c0265353dcbb88fa5d2c7d80d53ebadee49936d))
* swingset-runner zoe demos to use pre-bundled zcf ([3df964a](https://github.com/Agoric/agoric-sdk/commit/3df964a10f61715fa2d72b1c408bb1903df61181))
* update exchange benchmark to re-use simpleExchange contract ([3ecbee0](https://github.com/Agoric/agoric-sdk/commit/3ecbee059197dea5ff37a21465f68be9bcb463b8))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.2...@agoric/swingset-runner@0.5.0) (2020-06-30)


### Bug Fixes

* deal more gracefully with data sources that have a common base file name ([f05f3ba](https://github.com/Agoric/agoric-sdk/commit/f05f3ba70879d0312446f930881f32192fae42d6))
* eslint is tricksy, it is ([1245ebb](https://github.com/Agoric/agoric-sdk/commit/1245ebb686fd20112f17f6c3f5f422de76709e19))
* miscellaneous cleanups ([b184312](https://github.com/Agoric/agoric-sdk/commit/b184312046fa3425b8051601eece3bc5f9d68889))


### Features

* add benchmarking support to swingset-runner ([19a4ef7](https://github.com/Agoric/agoric-sdk/commit/19a4ef7b87c661b6774a4532e401dd96a23b0a3d))
* add facility for capturing and graphing kernel stats ([0df83b3](https://github.com/Agoric/agoric-sdk/commit/0df83b3b198632003abd38026b3136e21f99cd0b))
* add hook to pre-execute one round of benchmarking before starting to measure ([890f88a](https://github.com/Agoric/agoric-sdk/commit/890f88a511e8346c926a4c6fbf2f2320b404a9c2))
* add stats dumping capability to swingset runner and kernel dumper ([83efadc](https://github.com/Agoric/agoric-sdk/commit/83efadc6325ea78097d00401888712f15ccf1dce))
* count number of times various stats variables are incremented and decremented ([129f02f](https://github.com/Agoric/agoric-sdk/commit/129f02fb3c5a44950fa0ab12a715fc2f18911c08))
* kernel promise reference counting ([ba1ebc7](https://github.com/Agoric/agoric-sdk/commit/ba1ebc7b2561c6a4c856b16d4a24ba38a40d0d74))
* support value return from `bootstrap` and other exogenous messages ([a432606](https://github.com/Agoric/agoric-sdk/commit/a43260608412025991bcad3a48b20a486c3dbe15))
* Zoe simpleExchange perf test in swingset-runner ([79da155](https://github.com/Agoric/agoric-sdk/commit/79da15578750485b25a64626248078aee844c42e))





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.1...@agoric/swingset-runner@0.4.2) (2020-05-17)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.4.0...@agoric/swingset-runner@0.4.1) (2020-05-10)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0...@agoric/swingset-runner@0.4.0) (2020-05-04)


### Bug Fixes

* lint... ([1db8eac](https://github.com/Agoric/agoric-sdk/commit/1db8eacd5fdb0e6d6ec6d2f93bd29e7c9291da30))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* add crank number to kernel state ([75e5d53](https://github.com/Agoric/agoric-sdk/commit/75e5d53d36862e630b3ee8e9628d2237493eb8ae))
* Add support for dumping crank-by-crank snapshots of the kernel state as a swingset runs ([b49929e](https://github.com/Agoric/agoric-sdk/commit/b49929ed7139544e218601135bdfd3408ea770de))
* Improved console log diagnostics ([465329d](https://github.com/Agoric/agoric-sdk/commit/465329d1d7f740e82fa46da24be370e2081fcb33))





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.3.0-alpha.0...@agoric/swingset-runner@0.3.0) (2020-04-13)

**Note:** Version bump only for package @agoric/swingset-runner





# [0.3.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1...@agoric/swingset-runner@0.3.0-alpha.0) (2020-04-12)


### Bug Fixes

* shut up eslint ([fcc1ff3](https://github.com/Agoric/agoric-sdk/commit/fcc1ff33ffc26dde787c36413e094365e1d09c03))


### Features

* Be smarter about where database files are located. ([2eb1469](https://github.com/Agoric/agoric-sdk/commit/2eb14694a108899f1bafb725e3e0b4a34150a07f))
* new tool -- kernel state dump utility ([f55110e](https://github.com/Agoric/agoric-sdk/commit/f55110e0e4f5963faf1ff86895cd3d0120bb7eca))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.1-alpha.0...@agoric/swingset-runner@0.2.1) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





## [0.2.1-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-runner@0.2.0...@agoric/swingset-runner@0.2.1-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/swingset-runner





# 0.2.0 (2020-03-26)


### Features

* Add option to force GC after every block, add 'help' command, clean up error reporting ([e639ee5](https://github.com/Agoric/agoric-sdk/commit/e639ee5d69ce27eef40a8f0c6c8726dd81f8de3d))
* Add PDF and stdout support to stat-logger graphing ([22238e7](https://github.com/Agoric/agoric-sdk/commit/22238e75eb3e0726a7385c783c8f7678c48884d8))
* Log (and graph) database disk usage ([9f9f5af](https://github.com/Agoric/agoric-sdk/commit/9f9f5af964d6661bb1d6bd1f2ea91098bcad62b0))
