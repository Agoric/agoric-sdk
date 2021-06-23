# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
