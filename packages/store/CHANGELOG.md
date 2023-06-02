# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.9.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.9.1...@agoric/store@0.9.2) (2023-06-02)

**Note:** Version bump only for package @agoric/store





### [0.9.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.9.0...@agoric/store@0.9.1) (2023-05-24)

**Note:** Version bump only for package @agoric/store





## [0.9.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.3...@agoric/store@0.9.0) (2023-05-19)


### ⚠ BREAKING CHANGES

* rename 'fit' to 'mustMatch'

### Features

* **store:** reconcile with endo [#1554](https://github.com/Agoric/agoric-sdk/issues/1554) ([d39dafa](https://github.com/Agoric/agoric-sdk/commit/d39dafa00828d1be06b7bdcd1ef0632861a6632f))
* generic check unguarded far class methods ([805326e](https://github.com/Agoric/agoric-sdk/commit/805326e062fb162a6ee6fb93ca76e9a53299cd98))
* **farclass:** error message for missing `this` ([10b40d4](https://github.com/Agoric/agoric-sdk/commit/10b40d4e337e88c56f186266fdfb6cd9b35329f4))
* **store:** M.splitArray and M.splitRecord ([#6597](https://github.com/Agoric/agoric-sdk/issues/6597)) ([e7427e3](https://github.com/Agoric/agoric-sdk/commit/e7427e386bcbfbe99312b41342b1fa2e722c57c7))
* **types:** infer this.state in far classes ([11b35d3](https://github.com/Agoric/agoric-sdk/commit/11b35d38448c9665a6db5a919b37744d2d929a53))


### Bug Fixes

* adapt to deeplyFulfilled being async ([#6816](https://github.com/Agoric/agoric-sdk/issues/6816)) ([ec315e1](https://github.com/Agoric/agoric-sdk/commit/ec315e1634f6d5cdef1cddafc18777de7c04fecc))
* arb passable tools ([#6296](https://github.com/Agoric/agoric-sdk/issues/6296)) ([d91ee8c](https://github.com/Agoric/agoric-sdk/commit/d91ee8c549020678dccf8480d4355f537c73843d))
* collection type param defaults ([7c529b0](https://github.com/Agoric/agoric-sdk/commit/7c529b0c84a6cc76ac81a455b7b3bb8185ecbbfa))
* handle branded TimestampRecord in solo/store/agoric-cli/governance ([8369dd6](https://github.com/Agoric/agoric-sdk/commit/8369dd6a47e7e6c1c799a131fc38f340f0018b38))
* only the exo api change ([5cf3bf1](https://github.com/Agoric/agoric-sdk/commit/5cf3bf10a71dd02094365a66e87032e5d17d004f))
* **store:** fix exo-tools TSC problem ([#7177](https://github.com/Agoric/agoric-sdk/issues/7177)) ([68094ec](https://github.com/Agoric/agoric-sdk/commit/68094ecd94c9b3934a5dc5dea39b167d373d9beb))
* defendPrototypeKit with consolidated error checking ([#6668](https://github.com/Agoric/agoric-sdk/issues/6668)) ([c7d4223](https://github.com/Agoric/agoric-sdk/commit/c7d422343c9fdfd173b6e756ad2a02577d7c4574))
* prepare for patterns to schematize storage ([#6819](https://github.com/Agoric/agoric-sdk/issues/6819)) ([f0bd3d6](https://github.com/Agoric/agoric-sdk/commit/f0bd3d62c9e480b102fc077997c65d89c0488fa8))
* rename from FarClass to ExoClass, etc ([#6323](https://github.com/Agoric/agoric-sdk/issues/6323)) ([da96c7c](https://github.com/Agoric/agoric-sdk/commit/da96c7c3c902a5e266baeedf23df02481f2e9c9d))
* sync with endo 1260 encodePassable ([#6260](https://github.com/Agoric/agoric-sdk/issues/6260)) ([0a1c89c](https://github.com/Agoric/agoric-sdk/commit/0a1c89cbf6838fe78e5db7fab7b29bf1eaede1de)), closes [#1260](https://github.com/Agoric/agoric-sdk/issues/1260)
* typo in error message ([#6470](https://github.com/Agoric/agoric-sdk/issues/6470)) ([65d8e0a](https://github.com/Agoric/agoric-sdk/commit/65d8e0a5e1e94911e93ac52137316be1e50ae13d))
* use atomicTransfers rather than stagings. ([#6577](https://github.com/Agoric/agoric-sdk/issues/6577)) ([65d3f14](https://github.com/Agoric/agoric-sdk/commit/65d3f14c8102993168d2568eed5e6acbcba0c48a))
* without assertKeyPattern ([#7035](https://github.com/Agoric/agoric-sdk/issues/7035)) ([c9fcd7f](https://github.com/Agoric/agoric-sdk/commit/c9fcd7f82757732435cd96f3377e4fbfb6586ce7))


### Miscellaneous Chores

* rename 'fit' to 'mustMatch' ([9fa3232](https://github.com/Agoric/agoric-sdk/commit/9fa32324f84bfb85de9e99e0c9ad277b8017b50e)), closes [#6844](https://github.com/Agoric/agoric-sdk/issues/6844)



### [0.8.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.4...@agoric/store@0.8.5) (2023-02-17)

**Note:** Version bump only for package @agoric/store





### [0.8.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.3...@agoric/store@0.8.4) (2022-12-14)

**Note:** Version bump only for package @agoric/store





### [0.8.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.2...@agoric/store@0.8.3) (2022-10-18)

**Note:** Version bump only for package @agoric/store





### [0.8.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.1...@agoric/store@0.8.2) (2022-10-08)

**Note:** Version bump only for package @agoric/store





### [0.8.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.8.0...@agoric/store@0.8.1) (2022-10-05)


### Bug Fixes

* test-rankOrder works on ava 3 or 4 ([#6327](https://github.com/Agoric/agoric-sdk/issues/6327)) ([9f75b0e](https://github.com/Agoric/agoric-sdk/commit/9f75b0e840c151c36b46150451e3c74860a90710))



## [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.7.2...@agoric/store@0.8.0) (2022-09-20)


### ⚠ BREAKING CHANGES

* **store:** move from Schema to Shape terminology (#6072)
* **store:** split `provide` into collision vs no-collision variants (#6080)
* **store:** move some util where they are more reusable (#5990)

### Features

* enable collection deletion without swapping in key objects ([8ed6493](https://github.com/Agoric/agoric-sdk/commit/8ed64935fc922881b31c87e451fb2c12b38c0138)), closes [#5053](https://github.com/Agoric/agoric-sdk/issues/5053)
* **store:** helper for atomic store provider ([6001a6d](https://github.com/Agoric/agoric-sdk/commit/6001a6d5449a2af7095ab56c82b5b86ec8885b70))
* add fakeDurable option to assist durability conversion ([7c02404](https://github.com/Agoric/agoric-sdk/commit/7c0240402a52ca82c948d9a0b9730824a84b4951)), closes [#5454](https://github.com/Agoric/agoric-sdk/issues/5454)


### Bug Fixes

* bad check defaults ([#6076](https://github.com/Agoric/agoric-sdk/issues/6076)) ([400bccb](https://github.com/Agoric/agoric-sdk/commit/400bccb10c798530d565f29ee677bf6313fd5237))
* better mismatch errors ([#5947](https://github.com/Agoric/agoric-sdk/issues/5947)) ([46e34f6](https://github.com/Agoric/agoric-sdk/commit/46e34f6deb7e5d8210a227bdea32fe3e2296e9ef))
* Better pattern mismatch diagnostics ([#5906](https://github.com/Agoric/agoric-sdk/issues/5906)) ([cf97ba3](https://github.com/Agoric/agoric-sdk/commit/cf97ba310fb5eb5f1ff5946d7104fdf27bcccfd4))
* bug in M.setOf and M.bagOf ([#5952](https://github.com/Agoric/agoric-sdk/issues/5952)) ([c940736](https://github.com/Agoric/agoric-sdk/commit/c940736dae49a1d3095194839dae355d4db2a67f))
* comment wording ([2cb76b7](https://github.com/Agoric/agoric-sdk/commit/2cb76b728571f0155c1ca152688b0bb43a39c348))
* correct input validation of displayInfo ([#5876](https://github.com/Agoric/agoric-sdk/issues/5876)) ([7488530](https://github.com/Agoric/agoric-sdk/commit/74885306b09df45783dee8e63e97daa817cb0d9b)), closes [#5898](https://github.com/Agoric/agoric-sdk/issues/5898)
* far classes with interface guards, used by ERTP ([#5960](https://github.com/Agoric/agoric-sdk/issues/5960)) ([a8882a1](https://github.com/Agoric/agoric-sdk/commit/a8882a1cef97c9177bf76d04d1a1253d02c7921b))
* harden the right thing ([#5941](https://github.com/Agoric/agoric-sdk/issues/5941)) ([004aa59](https://github.com/Agoric/agoric-sdk/commit/004aa59414b08f7272344667ba66183326967fee))
* heap far classes ([#6107](https://github.com/Agoric/agoric-sdk/issues/6107)) ([c10c36d](https://github.com/Agoric/agoric-sdk/commit/c10c36d7ccf6c85239c1dbcec9534d43b20ad00a))
* Make pattern matching faster ([#6158](https://github.com/Agoric/agoric-sdk/issues/6158)) ([9a2b427](https://github.com/Agoric/agoric-sdk/commit/9a2b427416e5e17a63cfa7c90dfa674741365d24))
* patterns impose resource limits ([#6057](https://github.com/Agoric/agoric-sdk/issues/6057)) ([548c053](https://github.com/Agoric/agoric-sdk/commit/548c053dbe779fe8cede2ca5651c146c9fee2a8e))
* prepare for inherited method representation ([#5989](https://github.com/Agoric/agoric-sdk/issues/5989)) ([348b860](https://github.com/Agoric/agoric-sdk/commit/348b860c62d9479962df268cfb1795b6c369c2b8))
* Use new `||` assert style, but when TS confused use `if` instead ([#6174](https://github.com/Agoric/agoric-sdk/issues/6174)) ([94625d3](https://github.com/Agoric/agoric-sdk/commit/94625d38c3bb5333b00a69dd3086b1ac13490f62))
* **store:** move some util where they are more reusable ([#5990](https://github.com/Agoric/agoric-sdk/issues/5990)) ([0eb83cd](https://github.com/Agoric/agoric-sdk/commit/0eb83cdf3650f75c70be02e863f341214e0e9a8d))
* time as branded value ([#5821](https://github.com/Agoric/agoric-sdk/issues/5821)) ([34078ff](https://github.com/Agoric/agoric-sdk/commit/34078ff4b34a498f96f3cb83df3a0b930b98bbec))


### Code Refactoring

* **store:** move from Schema to Shape terminology ([#6072](https://github.com/Agoric/agoric-sdk/issues/6072)) ([757b887](https://github.com/Agoric/agoric-sdk/commit/757b887edd2d41960fadc86d4900ebde55729867))
* **store:** split `provide` into collision vs no-collision variants ([#6080](https://github.com/Agoric/agoric-sdk/issues/6080)) ([939e25e](https://github.com/Agoric/agoric-sdk/commit/939e25e615ea1fcefff15a032996613031151c0d)), closes [#5875](https://github.com/Agoric/agoric-sdk/issues/5875)



### [0.7.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.7.1...@agoric/store@0.7.2) (2022-05-28)

**Note:** Version bump only for package @agoric/store





### [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.7.0...@agoric/store@0.7.1) (2022-05-09)


### Bug Fixes

* provide provide, a get-or-make for mapStores ([#5282](https://github.com/Agoric/agoric-sdk/issues/5282)) ([9975529](https://github.com/Agoric/agoric-sdk/commit/9975529c2bc34664e8f908855cf68a74cbfec871))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.10...@agoric/store@0.7.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Bug Fixes

* Encode Passables, not just keys ([#4470](https://github.com/Agoric/agoric-sdk/issues/4470)) ([715950d](https://github.com/Agoric/agoric-sdk/commit/715950d6bfcbe6bc778b65a256dc5d26299172db))
* renamings [#4470](https://github.com/Agoric/agoric-sdk/issues/4470) missed ([#4896](https://github.com/Agoric/agoric-sdk/issues/4896)) ([98c9f0e](https://github.com/Agoric/agoric-sdk/commit/98c9f0eabf6f0a85581e34ca0adf24f9805d1f0c))


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.6.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.9...@agoric/store@0.6.10) (2022-02-24)

**Note:** Version bump only for package @agoric/store





### [0.6.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.8...@agoric/store@0.6.9) (2022-02-21)


### Features

* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))
* support element deletion during iteration over a store ([8bb9770](https://github.com/Agoric/agoric-sdk/commit/8bb97702fd478b0b47e2d5454373e80765042106)), closes [#4503](https://github.com/Agoric/agoric-sdk/issues/4503)


### Bug Fixes

* Remove extraneous eslint globals ([17087e4](https://github.com/Agoric/agoric-sdk/commit/17087e4605db7d3b30dfccf2434b2850b45e3408))
* **store:** use explicit `import('@endo/marshal')` JSDoc ([4795147](https://github.com/Agoric/agoric-sdk/commit/47951473d4679c7e95104f5ae32fe63c8547598e))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))
* fullOrder leak. Semi-fungibles via CopyBags ([#4305](https://github.com/Agoric/agoric-sdk/issues/4305)) ([79c4276](https://github.com/Agoric/agoric-sdk/commit/79c4276da8c856674bd425c54715adec92648c48))
* keys but no patterns yet ([b1fe93b](https://github.com/Agoric/agoric-sdk/commit/b1fe93b0a6b6b04586e48439c596d2436af2f8f4))
* minor adjustments from purple day1 ([#4271](https://github.com/Agoric/agoric-sdk/issues/4271)) ([72cc8d6](https://github.com/Agoric/agoric-sdk/commit/72cc8d6bcf428596653593708959446fb0a29596))
* minor, from purple ([#4304](https://github.com/Agoric/agoric-sdk/issues/4304)) ([2984a74](https://github.com/Agoric/agoric-sdk/commit/2984a7487bcc6064c6cb899b7540e11159eedefd))
* missing Far on some iterables ([#4250](https://github.com/Agoric/agoric-sdk/issues/4250)) ([fe997f2](https://github.com/Agoric/agoric-sdk/commit/fe997f28467eb7f61b711e63a581f396f8390e91))
* ordered set operations ([#4196](https://github.com/Agoric/agoric-sdk/issues/4196)) ([bda9206](https://github.com/Agoric/agoric-sdk/commit/bda920694c7ab573822415653335e258b9c21281))
* Patterns and Keys ([#4210](https://github.com/Agoric/agoric-sdk/issues/4210)) ([cc99f7e](https://github.com/Agoric/agoric-sdk/commit/cc99f7ed7f6de1b6ee86b1b813649820e741e1dc))
* quick "fix" of a red squiggle problem ([#4447](https://github.com/Agoric/agoric-sdk/issues/4447)) ([ee39651](https://github.com/Agoric/agoric-sdk/commit/ee396514c14213a7c9dfa4f73919a9cfe77dd2e6))
* remove pureCopy deleted from endo 1061 ([#4458](https://github.com/Agoric/agoric-sdk/issues/4458)) ([50e8523](https://github.com/Agoric/agoric-sdk/commit/50e852346d0b4005c613e30d10b469d89a4e5564))
* sort preserving order for composite keys ([#4468](https://github.com/Agoric/agoric-sdk/issues/4468)) ([ba1b2ef](https://github.com/Agoric/agoric-sdk/commit/ba1b2efb4bc0f2ca8833ad821a72f400ecb12952))
* towards patterns and stores ([c241e39](https://github.com/Agoric/agoric-sdk/commit/c241e3978a36778197b1bf3874b07f1ed4df9ceb))
* update sort order so undefined comes last ([2d5ab57](https://github.com/Agoric/agoric-sdk/commit/2d5ab5780e83063e387955f8a8e940119c0a1a5c))



### [0.6.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.7...@agoric/store@0.6.8) (2021-12-22)

**Note:** Version bump only for package @agoric/store





### [0.6.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.6...@agoric/store@0.6.7) (2021-12-02)

**Note:** Version bump only for package @agoric/store





### [0.6.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.5...@agoric/store@0.6.6) (2021-10-13)

**Note:** Version bump only for package @agoric/store





### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.4...@agoric/store@0.6.5) (2021-09-23)

**Note:** Version bump only for package @agoric/store





### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.3...@agoric/store@0.6.4) (2021-09-15)

**Note:** Version bump only for package @agoric/store





### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.2...@agoric/store@0.6.3) (2021-08-18)

**Note:** Version bump only for package @agoric/store





### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.1...@agoric/store@0.6.2) (2021-08-17)

**Note:** Version bump only for package @agoric/store





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.6.0...@agoric/store@0.6.1) (2021-08-16)

**Note:** Version bump only for package @agoric/store





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.22...@agoric/store@0.6.0) (2021-08-15)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)



## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.22...@agoric/store@0.5.0) (2021-08-14)


### ⚠ BREAKING CHANGES

* **swingset:** Convert RESM to NESM

### Code Refactoring

* **swingset:** Convert RESM to NESM ([bf7fd61](https://github.com/Agoric/agoric-sdk/commit/bf7fd6161a79e994c3bc48949e4ccb01b4048772))

### 0.26.10 (2021-07-28)



### [0.4.23](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.22...@agoric/store@0.4.23) (2021-07-28)

**Note:** Version bump only for package @agoric/store





### [0.4.22](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.21...@agoric/store@0.4.22) (2021-07-01)

**Note:** Version bump only for package @agoric/store





### [0.4.21](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.20...@agoric/store@0.4.21) (2021-06-28)

**Note:** Version bump only for package @agoric/store





### [0.4.20](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.19...@agoric/store@0.4.20) (2021-06-25)

**Note:** Version bump only for package @agoric/store





### [0.4.19](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.18...@agoric/store@0.4.19) (2021-06-24)

**Note:** Version bump only for package @agoric/store





### [0.4.18](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.17...@agoric/store@0.4.18) (2021-06-24)

**Note:** Version bump only for package @agoric/store





### [0.4.17](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.16...@agoric/store@0.4.17) (2021-06-23)

**Note:** Version bump only for package @agoric/store





### [0.4.16](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.15...@agoric/store@0.4.16) (2021-06-16)

**Note:** Version bump only for package @agoric/store





### [0.4.15](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.14...@agoric/store@0.4.15) (2021-06-15)


### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))



## [0.4.14](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.13...@agoric/store@0.4.14) (2021-05-10)

**Note:** Version bump only for package @agoric/store





## [0.4.13](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.12...@agoric/store@0.4.13) (2021-05-05)

**Note:** Version bump only for package @agoric/store





## [0.4.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.11...@agoric/store@0.4.12) (2021-05-05)

**Note:** Version bump only for package @agoric/store





## [0.4.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.10...@agoric/store@0.4.11) (2021-04-22)

**Note:** Version bump only for package @agoric/store





## [0.4.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.9...@agoric/store@0.4.10) (2021-04-18)

**Note:** Version bump only for package @agoric/store





## [0.4.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.8...@agoric/store@0.4.9) (2021-04-16)

**Note:** Version bump only for package @agoric/store





## [0.4.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.7...@agoric/store@0.4.8) (2021-04-14)

**Note:** Version bump only for package @agoric/store





## [0.4.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.6...@agoric/store@0.4.7) (2021-04-13)

**Note:** Version bump only for package @agoric/store





## [0.4.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.5...@agoric/store@0.4.6) (2021-04-07)

**Note:** Version bump only for package @agoric/store





## [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.4...@agoric/store@0.4.5) (2021-04-06)


### Bug Fixes

* update to depend on ses 0.12.5 ([#2718](https://github.com/Agoric/agoric-sdk/issues/2718)) ([08dbe0d](https://github.com/Agoric/agoric-sdk/commit/08dbe0db5ce06944dc92c710865e441a60b31b5b))





## [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.3...@agoric/store@0.4.4) (2021-03-24)

**Note:** Version bump only for package @agoric/store





## [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.2...@agoric/store@0.4.3) (2021-03-16)


### Bug Fixes

* make separate 'test:xs' target, remove XS from 'test' target ([b9c1a69](https://github.com/Agoric/agoric-sdk/commit/b9c1a6987093fc8e09e8aba7acd2a1618413bac8)), closes [#2647](https://github.com/Agoric/agoric-sdk/issues/2647)
* **store:** reject empty-object keys which might not retain identity ([c38a4dc](https://github.com/Agoric/agoric-sdk/commit/c38a4dc8aca910d8a4ed5500f56f19ccdd3b43d1)), closes [#2018](https://github.com/Agoric/agoric-sdk/issues/2018)





## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.1...@agoric/store@0.4.2) (2021-02-22)

**Note:** Version bump only for package @agoric/store





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.4.0...@agoric/store@0.4.1) (2021-02-16)


### Bug Fixes

* review comments ([7db7e5c](https://github.com/Agoric/agoric-sdk/commit/7db7e5c4c569dfedff8d748dd58893218b0a2458))





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.3.1...@agoric/store@0.4.0) (2020-12-10)


### Features

* **import-bundle:** Preliminary support Endo zip hex bundle format ([#1983](https://github.com/Agoric/agoric-sdk/issues/1983)) ([983681b](https://github.com/Agoric/agoric-sdk/commit/983681bfc4bf512b6bd90806ed9220cd4fefc13c))





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.3.1-dev.0...@agoric/store@0.3.1) (2020-11-07)


### Bug Fixes

* export `@agoric/store/exported` ([4dee52b](https://github.com/Agoric/agoric-sdk/commit/4dee52ba250564781150df2c24ec22006968ca1a))





## [0.3.1-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.3.0...@agoric/store@0.3.1-dev.0) (2020-10-19)

**Note:** Version bump only for package @agoric/store





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.3-dev.2...@agoric/store@0.3.0) (2020-10-11)


### Bug Fixes

* improve API to punt serialization to the backing store ([fbfc0e7](https://github.com/Agoric/agoric-sdk/commit/fbfc0e75e910bc2fd36f0d60eac3929735d3fe68))
* update @agoric/store types and imports ([9e3493a](https://github.com/Agoric/agoric-sdk/commit/9e3493ad4d8c0a6a9230ad6a4c22a3254a867115))


### Features

* **store:** implement external store machinery ([df4f550](https://github.com/Agoric/agoric-sdk/commit/df4f550270894c75fe25f252ee5db66d4c77e8db))





## [0.2.3-dev.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.3-dev.1...@agoric/store@0.2.3-dev.2) (2020-09-18)

**Note:** Version bump only for package @agoric/store





## [0.2.3-dev.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.3-dev.0...@agoric/store@0.2.3-dev.1) (2020-09-18)

**Note:** Version bump only for package @agoric/store





## [0.2.3-dev.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.2...@agoric/store@0.2.3-dev.0) (2020-09-18)

**Note:** Version bump only for package @agoric/store





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.1...@agoric/store@0.2.2) (2020-09-16)

**Note:** Version bump only for package @agoric/store





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.2.0...@agoric/store@0.2.1) (2020-08-31)


### Bug Fixes

* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))





# [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.1.2...@agoric/store@0.2.0) (2020-06-30)


### Bug Fixes

* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))





## [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.1.1...@agoric/store@0.1.2) (2020-05-17)

**Note:** Version bump only for package @agoric/store





## [0.1.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.1.0...@agoric/store@0.1.1) (2020-05-10)

**Note:** Version bump only for package @agoric/store





# [0.1.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.0.4...@agoric/store@0.1.0) (2020-05-04)


### Bug Fixes

* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))


### Features

* implement channel host handler ([4e68f44](https://github.com/Agoric/agoric-sdk/commit/4e68f441b46d70dee481387ab96e88f1e0b69bfa))





## [0.0.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.0.4-alpha.0...@agoric/store@0.0.4) (2020-04-13)

**Note:** Version bump only for package @agoric/store





## [0.0.4-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.0.3...@agoric/store@0.0.4-alpha.0) (2020-04-12)

**Note:** Version bump only for package @agoric/store





## [0.0.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.0.3-alpha.0...@agoric/store@0.0.3) (2020-04-02)

**Note:** Version bump only for package @agoric/store





## [0.0.3-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/store@0.0.2...@agoric/store@0.0.3-alpha.0) (2020-04-02)

**Note:** Version bump only for package @agoric/store





## 0.0.2 (2020-03-26)


### Bug Fixes

* introduce and use Store.entries() ([b572d51](https://github.com/Agoric/agoric-sdk/commit/b572d51df45641da59bc013a0f2e45a694e56cbc))
