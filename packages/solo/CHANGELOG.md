# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.5.3...@agoric/solo@0.5.4) (2021-12-22)


### Bug Fixes

* **solo:** take a dependency on `esm` to reenable plugins ([16e9f9b](https://github.com/Agoric/agoric-sdk/commit/16e9f9b08edeb412fb722adab593f22fde1e29a8))
* **wallet:** allow wallet app deep linking ([96d372e](https://github.com/Agoric/agoric-sdk/commit/96d372e781d3ce405fc82edea78a0633b0d61b9f))



### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.5.2...@agoric/solo@0.5.3) (2021-12-02)


### Features

* **agoric-cli:** enable the `agoric start --debug` option ([4f89a5b](https://github.com/Agoric/agoric-sdk/commit/4f89a5bc2250fb0d5cf64e937d2335b1a3857c7a))
* **solo:** tolerate transactions being rejected by ante handler ([6e3b6cd](https://github.com/Agoric/agoric-sdk/commit/6e3b6cd69fbd4eea38ea3979255dd40efd4daa32))
* replace internal usage of ag-chain-cosmos with agd ([d4e1128](https://github.com/Agoric/agoric-sdk/commit/d4e1128b8542c48b060ed1be9778e5779668d5b5))


### Bug Fixes

* **deps:** remove explicit `@agoric/babel-standalone` ([4f22453](https://github.com/Agoric/agoric-sdk/commit/4f22453a6f2de1a2c27ae8ad0d11b13116890dab))
* **solo:** export objects to CapTP on demand ([5e6dc54](https://github.com/Agoric/agoric-sdk/commit/5e6dc549da61f6c3e10be118a78167108b70b361))
* **solo:** trim overlong message bodies in debug logs ([7087181](https://github.com/Agoric/agoric-sdk/commit/7087181a33557871f509bee103787f667ef56969))



### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.5.1...@agoric/solo@0.5.2) (2021-10-13)

**Note:** Version bump only for package @agoric/solo





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.5.0...@agoric/solo@0.5.1) (2021-09-23)


### Features

* **solo:** make client objects appear earlier, parallelise chain ([656514e](https://github.com/Agoric/agoric-sdk/commit/656514e5937389c57e139bc1302fa435edd2e674))


### Bug Fixes

* **solo:** chain events come from both 'NewBlockHeader' and 'Tx' ([3cefa07](https://github.com/Agoric/agoric-sdk/commit/3cefa0758ab3c0397d7430d0b79b0e544f0d4249))
* **solo:** don't enforce origin identity; we have access tokens ([3015ecd](https://github.com/Agoric/agoric-sdk/commit/3015ecdd71cbc5d811c2bd88e2d51096919e4754))
* **solo:** make `localTimerService` in ms, and update correctly ([d6d4724](https://github.com/Agoric/agoric-sdk/commit/d6d472445a05b8c3d83fc9621879c3c91bf4d737))
* **timer:** remove deprecated `createRepeater` ([b45c66d](https://github.com/Agoric/agoric-sdk/commit/b45c66d6d5aadcd91bd2e50d31104bce8d4d78f6))



## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.6...@agoric/solo@0.5.0) (2021-09-15)


### ⚠ BREAKING CHANGES

* **solo:** watch for mailbox updates; not every Tendermint block
* clean up organization of swing-store

### Features

* **solo:** add `keys`, `init`, and `delete` to `home.scratch` ([1cecdcb](https://github.com/Agoric/agoric-sdk/commit/1cecdcb7dd571146164aba1e8eda0b6ad91a975a))


### Bug Fixes

* **deploy:** use `@endo/captp` epochs to mitigate crosstalk ([f2b5ba4](https://github.com/Agoric/agoric-sdk/commit/f2b5ba4bc29ca48e00f32982c713de3ec972e879))
* **solo:** make solo-to-chain more robust ([b266666](https://github.com/Agoric/agoric-sdk/commit/b2666665b1881d5f98fa853ba05627d945783c7c))
* **solo:** only subscribe to one copy of mailbox events ([9d58314](https://github.com/Agoric/agoric-sdk/commit/9d583148727ed90e9ac555fef75fef40ad90a0cf))
* **solo:** preserve ports in the `rpcAddr`; `--node` needs them ([7d83576](https://github.com/Agoric/agoric-sdk/commit/7d83576ca3aa4fd81077284bb544a56dcdd75f8c))
* **solo:** query WebSocket for mailbox instead of ag-cosmos-helper ([9a23c34](https://github.com/Agoric/agoric-sdk/commit/9a23c344e3d2c1980e27db23e3caa306a9bd655f))
* **solo:** watch for mailbox updates; not every Tendermint block ([35e9c87](https://github.com/Agoric/agoric-sdk/commit/35e9c87f263f9a6c7f0471ed268c8f52126a6dd6))
* **wallet:** handle solo restarts while deploying wallet backend ([a6c7bf8](https://github.com/Agoric/agoric-sdk/commit/a6c7bf8d781d3b2c5350d6b47d61b1ea9293b8d4))
* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))
* XS + SES snapshots are deterministic (test) ([#3781](https://github.com/Agoric/agoric-sdk/issues/3781)) ([95c5f01](https://github.com/Agoric/agoric-sdk/commit/95c5f014b2808ef1b3a32302bb37b3894e449abe)), closes [#2776](https://github.com/Agoric/agoric-sdk/issues/2776)


### Code Refactoring

* clean up organization of swing-store ([3c7e57b](https://github.com/Agoric/agoric-sdk/commit/3c7e57b8f62c0b93660dd57c002ffb96c2cd4137))



### [0.4.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.5...@agoric/solo@0.4.6) (2021-08-22)


### Bug Fixes

* **solo:** make solo-to-chain more robust ([ea0ef15](https://github.com/Agoric/agoric-sdk/commit/ea0ef15645fd851d82c9edf3ad862dcc256e172d))



### [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.4...@agoric/solo@0.4.5) (2021-08-21)

**Note:** Version bump only for package @agoric/solo





### [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.3...@agoric/solo@0.4.4) (2021-08-21)

**Note:** Version bump only for package @agoric/solo





### [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.2...@agoric/solo@0.4.3) (2021-08-18)


### Features

* **solo:** allow rpc servers to be specified as an URL ([91650e0](https://github.com/Agoric/agoric-sdk/commit/91650e0dd5a8bea20f161b9225edb1792ca17b55))



### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.1...@agoric/solo@0.4.2) (2021-08-17)

**Note:** Version bump only for package @agoric/solo





### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.4.0...@agoric/solo@0.4.1) (2021-08-16)

**Note:** Version bump only for package @agoric/solo





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.11...@agoric/solo@0.4.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Features

* **solo:** accept $SOLO_SLOGFILE to write a slogfile ([20f0c04](https://github.com/Agoric/agoric-sdk/commit/20f0c045eb7e948bbbac096b2f04d239767027d9))


### Bug Fixes

* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))
* **solo:** use SDK-local binaries rather than relying on $PATH ([ad96231](https://github.com/Agoric/agoric-sdk/commit/ad962312557adf87b56b5510ff1059ad669331ad))
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))


### Bug Fixes

* **cosmic-swingset:** decrease Nagling to 500ms ([260ecc9](https://github.com/Agoric/agoric-sdk/commit/260ecc9f437d427b2494e9b7d1a8a3994431164c))
* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **solo:** at the very least, kill our deployment process on exit ([fbc512d](https://github.com/Agoric/agoric-sdk/commit/fbc512d8e2466b81f0b59662b499449a52231101))
* **solo:** clean up unnecessary deep captp import ([8b20562](https://github.com/Agoric/agoric-sdk/commit/8b20562b9cc3917818455ab7d85aa74c9efb3f56))
* **solo:** don't give a hint that isn't useful ([ffc68bf](https://github.com/Agoric/agoric-sdk/commit/ffc68bf65d60c2a82bc0f6a5815d6a04495f4755))
* **solo:** make delivery process more robust ([2a3ff01](https://github.com/Agoric/agoric-sdk/commit/2a3ff017e1d7e8a127154e052c45157c7605f3b9))



## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.11...@agoric/solo@0.3.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Features

* **solo:** accept $SOLO_SLOGFILE to write a slogfile ([20f0c04](https://github.com/Agoric/agoric-sdk/commit/20f0c045eb7e948bbbac096b2f04d239767027d9))


### Bug Fixes

* **cosmos:** don't force the output format to JSON ([671b93d](https://github.com/Agoric/agoric-sdk/commit/671b93d6032656dceeee1616b849535145b3e10d))
* **swingset:** delete unused snapshots ([#3505](https://github.com/Agoric/agoric-sdk/issues/3505)) ([317959d](https://github.com/Agoric/agoric-sdk/commit/317959d77ca669c8e4bbf504d89fe55bdd383253)), closes [#3374](https://github.com/Agoric/agoric-sdk/issues/3374) [#3431](https://github.com/Agoric/agoric-sdk/issues/3431)


### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))


### Bug Fixes

* **cosmic-swingset:** decrease Nagling to 500ms ([260ecc9](https://github.com/Agoric/agoric-sdk/commit/260ecc9f437d427b2494e9b7d1a8a3994431164c))
* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **solo:** at the very least, kill our deployment process on exit ([fbc512d](https://github.com/Agoric/agoric-sdk/commit/fbc512d8e2466b81f0b59662b499449a52231101))
* **solo:** clean up unnecessary deep captp import ([8b20562](https://github.com/Agoric/agoric-sdk/commit/8b20562b9cc3917818455ab7d85aa74c9efb3f56))
* **solo:** don't give a hint that isn't useful ([ffc68bf](https://github.com/Agoric/agoric-sdk/commit/ffc68bf65d60c2a82bc0f6a5815d6a04495f4755))
* **solo:** make delivery process more robust ([2a3ff01](https://github.com/Agoric/agoric-sdk/commit/2a3ff017e1d7e8a127154e052c45157c7605f3b9))



### [0.2.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.11...@agoric/solo@0.2.12) (2021-07-28)


### Features

* improve ag-solo robustness and performance ([b101d3a](https://github.com/Agoric/agoric-sdk/commit/b101d3a4cd4fc97c4a6c794877efc47d43b12f02))
* **solo:** separate hot helper address from cold fees and egress ([20cdfa8](https://github.com/Agoric/agoric-sdk/commit/20cdfa8d89788d6903ea927bf9b3d59ece775251))


### Bug Fixes

* **cosmic-swingset:** decrease Nagling to 500ms ([260ecc9](https://github.com/Agoric/agoric-sdk/commit/260ecc9f437d427b2494e9b7d1a8a3994431164c))
* **cosmic-swingset:** messagePool ordering and authz indirection ([c49a2ea](https://github.com/Agoric/agoric-sdk/commit/c49a2ea92c6bd910316e939274a4ff80e41cdd18))
* **solo:** at the very least, kill our deployment process on exit ([fbc512d](https://github.com/Agoric/agoric-sdk/commit/fbc512d8e2466b81f0b59662b499449a52231101))
* **solo:** clean up unnecessary deep captp import ([8b20562](https://github.com/Agoric/agoric-sdk/commit/8b20562b9cc3917818455ab7d85aa74c9efb3f56))
* **solo:** don't give a hint that isn't useful ([ffc68bf](https://github.com/Agoric/agoric-sdk/commit/ffc68bf65d60c2a82bc0f6a5815d6a04495f4755))
* **solo:** make delivery process more robust ([2a3ff01](https://github.com/Agoric/agoric-sdk/commit/2a3ff017e1d7e8a127154e052c45157c7605f3b9))



### [0.2.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.10...@agoric/solo@0.2.11) (2021-07-01)


### Bug Fixes

* retreat from `xs-worker-no-gc` to `xs-worker` ([ce5ce00](https://github.com/Agoric/agoric-sdk/commit/ce5ce00c6a07d59ee249bfd736a3d5a66c8b903f))



### [0.2.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.9...@agoric/solo@0.2.10) (2021-07-01)

**Note:** Version bump only for package @agoric/solo





### [0.2.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.8...@agoric/solo@0.2.9) (2021-06-28)


### Features

* demand-paged vats are reloaded from heap snapshots ([#2848](https://github.com/Agoric/agoric-sdk/issues/2848)) ([cb239cb](https://github.com/Agoric/agoric-sdk/commit/cb239cbb27943ad58c304d85ee9b61ba917af79c)), closes [#2273](https://github.com/Agoric/agoric-sdk/issues/2273) [#2277](https://github.com/Agoric/agoric-sdk/issues/2277) [#2422](https://github.com/Agoric/agoric-sdk/issues/2422)



### [0.2.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.7...@agoric/solo@0.2.8) (2021-06-25)


### Features

* **swingset:** introduce 'xs-worker-no-gc' for forward compat ([e46cd88](https://github.com/Agoric/agoric-sdk/commit/e46cd883449c02559e2c0c49b66e26695b4b99da))



### [0.2.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.6...@agoric/solo@0.2.7) (2021-06-24)


### Bug Fixes

* maybe the best of both worlds: xs-worker but no explicit gc() ([8d38e9a](https://github.com/Agoric/agoric-sdk/commit/8d38e9a3d50987cd21e642e330d482e6e733cd3c))



### [0.2.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.5...@agoric/solo@0.2.6) (2021-06-24)


### Bug Fixes

* use 'local' worker, not xsnap, on both solo and chain ([a061a3e](https://github.com/Agoric/agoric-sdk/commit/a061a3e92f4ab90d293dfb5bff0223a24ed12d87)), closes [#3403](https://github.com/Agoric/agoric-sdk/issues/3403)



### [0.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.4...@agoric/solo@0.2.5) (2021-06-23)


### Bug Fixes

* **solo:** change default vatManager to 'xs-worker' ([eebaa2d](https://github.com/Agoric/agoric-sdk/commit/eebaa2d75aa2e42786892340af81d137d2058d99)), closes [#3393](https://github.com/Agoric/agoric-sdk/issues/3393)
* **solo:** finish changing default vatManager to 'xs-worker' ([ea19295](https://github.com/Agoric/agoric-sdk/commit/ea1929548de02d60bdbd8c204c3e032b9a258a63))
* **solo:** stop using install-metering-and-ses ([b21fb61](https://github.com/Agoric/agoric-sdk/commit/b21fb615016386edd206dfbe8f364cf42398b4d4)), closes [#3373](https://github.com/Agoric/agoric-sdk/issues/3373)



### [0.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.3...@agoric/solo@0.2.4) (2021-06-16)

**Note:** Version bump only for package @agoric/solo





### [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.2...@agoric/solo@0.2.3) (2021-06-15)


### Features

* modify all SwingStore uses to reflect constructor renaming ([9cda6a4](https://github.com/Agoric/agoric-sdk/commit/9cda6a4542bb64d72ddd42d08e2056f5323b18a9))
* new access-token package for encapsulation from swing-store ([aa52d2e](https://github.com/Agoric/agoric-sdk/commit/aa52d2ea54ec679889db9abdb8cdd6639824f50e))
* remove .jsonlines hack from simple swing store ([ef87997](https://github.com/Agoric/agoric-sdk/commit/ef87997a1519b18f23656b57bf38055fea203f9a))
* remove no-LMDB fallback from cosmic-swingset ([11dba7a](https://github.com/Agoric/agoric-sdk/commit/11dba7a145711097966ed41b9d36dd2ffdad2846))
* use 'engine-gc.js' to get the Node.js garbage collector ([0153529](https://github.com/Agoric/agoric-sdk/commit/0153529cbfc0b7da2d1ec434b32b2171bc246f93))


### Bug Fixes

* convert swing-store-simple to "type": "module" ([93279c1](https://github.com/Agoric/agoric-sdk/commit/93279c10a01ce55790a0aa8b5f9e2b2ce7e1732e))
* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))



## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.1...@agoric/solo@0.2.2) (2021-05-10)

**Note:** Version bump only for package @agoric/solo





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/solo@0.2.0...@agoric/solo@0.2.1) (2021-05-05)

**Note:** Version bump only for package @agoric/solo





# 0.2.0 (2021-05-05)


### Bug Fixes

* more Docker paths ([7783bb4](https://github.com/Agoric/agoric-sdk/commit/7783bb4740f4ea83b788fec45c1d1aa70145bba1))
* properly hang when `ag-solo start` is run ([b63135f](https://github.com/Agoric/agoric-sdk/commit/b63135fb7f72b6c5a0498cb243909ae39b5d860a))
* **solo:** propagate exit status ([1f6537e](https://github.com/Agoric/agoric-sdk/commit/1f6537e513e0bfa2ed6e28780903f18255ebf3d1))
* adjust git-revision.txt generation ([6a8b0f2](https://github.com/Agoric/agoric-sdk/commit/6a8b0f20df17d5427b1c70273bcc170c7945dc2a))
* clean up Docker directory usage ([a97d0b3](https://github.com/Agoric/agoric-sdk/commit/a97d0b3edc1f47e04d93d37c6e999d0798903d03))
* eliminate unnecessary script indirection ([119d7b9](https://github.com/Agoric/agoric-sdk/commit/119d7b91d4042e0881b4bd8acf79391709bcd08d))


### Features

* default to xs-worker in chain ([#2995](https://github.com/Agoric/agoric-sdk/issues/2995)) ([7ebb5d8](https://github.com/Agoric/agoric-sdk/commit/7ebb5d8dac86662e167ff0333cc655bd511d2c58))
* **solo:** fully-working ag-solo package ([57ea595](https://github.com/Agoric/agoric-sdk/commit/57ea59584e28f32288de62aa1be4d5717a0d146b))
