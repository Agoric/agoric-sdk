# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.5.1...@agoric/vat-data@0.5.2) (2023-06-02)

**Note:** Version bump only for package @agoric/vat-data





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.5.0...@agoric/vat-data@0.5.1) (2023-05-24)

**Note:** Version bump only for package @agoric/vat-data





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.3...@agoric/vat-data@0.5.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* **vat-data:** deprecate kinds in favor of Far Classes (#6106)

### Features

* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **types:** infer this.state in far classes ([11b35d3](https://github.com/Agoric/agoric-sdk/commit/11b35d38448c9665a6db5a919b37744d2d929a53))
* **vat-data:** export overlooked `provideDurableWeakSetStore` ([b804736](https://github.com/Agoric/agoric-sdk/commit/b804736497525da3fd8cb96e892d06cd2a68ea25))


### Bug Fixes

* **types:** makeStoreUtils return types ([bd07ba0](https://github.com/Agoric/agoric-sdk/commit/bd07ba024734a383ae7554f1f3f85c62b1c86093))
* **vat-data:** normalize kindName mangling ([5bf0088](https://github.com/Agoric/agoric-sdk/commit/5bf0088cf26cc9e2b8d1d4188e9de427045b7b72))
* prepare for patterns to schematize storage ([#6819](https://github.com/Agoric/agoric-sdk/issues/6819)) ([f0bd3d6](https://github.com/Agoric/agoric-sdk/commit/f0bd3d62c9e480b102fc077997c65d89c0488fa8))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* rename vivify to prepare ([#6825](https://github.com/Agoric/agoric-sdk/issues/6825)) ([9261e42](https://github.com/Agoric/agoric-sdk/commit/9261e42e677a3fc31f52defc8fc7ae800f098838))
* without assertKeyPattern ([#7035](https://github.com/Agoric/agoric-sdk/issues/7035)) ([c9fcd7f](https://github.com/Agoric/agoric-sdk/commit/c9fcd7f82757732435cd96f3377e4fbfb6586ce7))
* **types:** far class maker params ([91e8fce](https://github.com/Agoric/agoric-sdk/commit/91e8fcecc9c45d3c8725489656f393704738e32a))
* **vat-data:** deprecate kinds in favor of Far Classes ([#6106](https://github.com/Agoric/agoric-sdk/issues/6106)) ([b63360b](https://github.com/Agoric/agoric-sdk/commit/b63360b416b06cb654d5fc51428a3252e1f0b34f))



### [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/vat-data@0.4.4...@agoric/vat-data@0.4.5) (2023-02-17)

**Note:** Version bump only for package @agoric/vat-data





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
