# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.3...@agoric/vat-data@0.4.4) (2022-12-14)

**Note:** Version bump only for package @agoric/vat-data





### [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.2...@agoric/vat-data@0.4.3) (2022-10-18)

**Note:** Version bump only for package @agoric/vat-data





### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.1...@agoric/vat-data@0.4.2) (2022-10-08)

**Note:** Version bump only for package @agoric/vat-data





### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.0...@agoric/vat-data@0.4.1) (2022-10-05)

**Note:** Version bump only for package @agoric/vat-data





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.3.1...@agoric/vat-data@0.4.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** split `provide` into collision vs no-collision variants (#6080)
* **store:** move some util where they are more reusable (#5990)

### Bug Fixes

* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* heap far classes ([#6107](https://github.com/Agoric/agoric-sdk/issues/6107)) ([c10c36d](https://github.com/Agoric/agoric-sdk/commit/c10c36d7ccf6c85239c1dbcec9534d43b20ad00a))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* **vat-data:** utility type FunctionsPlusContext ([#5607](https://github.com/Agoric/agoric-sdk/issues/5607)) ([7dbe6c0](https://github.com/Agoric/agoric-sdk/commit/7dbe6c0e948f0686ed77ef3439c69f6af1dc29d2))


### Code Refactoring

* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



### [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.3.0...@agoric/vat-data@0.3.1) (2022-05-28)

**Note:** Version bump only for package @agoric/vat-data





## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.2.0...@agoric/vat-data@0.3.0) (2022-05-09)


### Features

* implement durable promise watchers ([ce55851](https://github.com/Agoric/agoric-sdk/commit/ce558515467e869e784260f5478802835c5eb9cf)), closes [#5006](https://github.com/Agoric/agoric-sdk/issues/5006)
* **vat-data:** partialAssign function ([96a6243](https://github.com/Agoric/agoric-sdk/commit/96a6243915c736f00fffc7d059cf963d9d5a2f8f))



## 0.2.0 (2022-04-18)


### Features

* split single- and multi-faceted VO definitions into their own functions ([fcf293a](https://github.com/Agoric/agoric-sdk/commit/fcf293a4fcdf64bf30b377c7b3fb8b728efbb4af)), closes [#5093](https://github.com/Agoric/agoric-sdk/issues/5093)
* yet another overhaul of the `defineKind` API ([3e02d42](https://github.com/Agoric/agoric-sdk/commit/3e02d42312b2963c165623c8cd559b431e5ecdce)), closes [#4905](https://github.com/Agoric/agoric-sdk/issues/4905)
