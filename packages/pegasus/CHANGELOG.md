# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.7.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.11...@agoric/pegasus@0.7.12) (2023-06-09)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.10...@agoric/pegasus@0.7.11) (2023-06-02)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.9...@agoric/pegasus@0.7.10) (2023-05-24)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.6...@agoric/pegasus@0.7.9) (2023-05-19)


### Bug Fixes

* use `subscribeEach` to get reconnect benefits ([fb24132](https://github.com/Agoric/agoric-sdk/commit/fb24132f9b4e117e56bae2803994e57c188344f3))
* use atomicTransfers rather than stagings. ([#6577](https://github.com/Agoric/agoric-sdk/issues/6577)) ([65d3f14](https://github.com/Agoric/agoric-sdk/commit/65d3f14c8102993168d2568eed5e6acbcba0c48a))



### [0.7.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.7...@agoric/pegasus@0.7.8) (2023-02-17)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.6...@agoric/pegasus@0.7.7) (2022-12-14)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.5...@agoric/pegasus@0.7.6) (2022-10-18)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.4...@agoric/pegasus@0.7.5) (2022-10-08)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.3...@agoric/pegasus@0.7.4) (2022-10-05)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.2...@agoric/pegasus@0.7.3) (2022-09-20)


### Bug Fixes

* show more stacks ([#5980](https://github.com/Agoric/agoric-sdk/issues/5980)) ([7e22057](https://github.com/Agoric/agoric-sdk/commit/7e220575af0e5b0607d821675c57a3714f48fd65))



### [0.7.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.1...@agoric/pegasus@0.7.2) (2022-05-28)

**Note:** Version bump only for package @agoric/pegasus





### [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.7.0...@agoric/pegasus@0.7.1) (2022-05-09)

**Note:** Version bump only for package @agoric/pegasus





## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.6.1...@agoric/pegasus@0.7.0) (2022-04-18)


### ⚠ BREAKING CHANGES

* consistent Node engine requirement (>=14.15.0)

### Features

* **pegasus:** prepare for governance ([4c921b5](https://github.com/Agoric/agoric-sdk/commit/4c921b501e425e861479c9197bc24d1d09f4a2ac))
* **vats:** remove pegasus from bootstrap ([c384a41](https://github.com/Agoric/agoric-sdk/commit/c384a41c6e494059beb28c09a94e5625faa5f87e))
* implement the durable kind API ([56bad98](https://github.com/Agoric/agoric-sdk/commit/56bad985275787d18c34ac14b377a4d0348d699b)), closes [#4495](https://github.com/Agoric/agoric-sdk/issues/4495)


### Miscellaneous Chores

* consistent Node engine requirement (>=14.15.0) ([ddc40fa](https://github.com/Agoric/agoric-sdk/commit/ddc40fa525f845ed900512c38b99f01458a3d131))



### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.6.0...@agoric/pegasus@0.6.1) (2022-02-24)


### Features

* overhaul the virtual object API ([e40674b](https://github.com/Agoric/agoric-sdk/commit/e40674b0b19f29adde2f5e6a460bafb7340d42b6)), closes [#4606](https://github.com/Agoric/agoric-sdk/issues/4606)



## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.5.1...@agoric/pegasus@0.6.0) (2022-02-21)


### ⚠ BREAKING CHANGES

* **pegasus:** make more robust and remove public state

### Features

* **pegasus:** implement correct result and denom trace handling ([aacf1c3](https://github.com/Agoric/agoric-sdk/commit/aacf1c39f840beb31702f3fcd3565771ccaf7817))
* **pegasus:** make more robust and remove public state ([a5413f7](https://github.com/Agoric/agoric-sdk/commit/a5413f781fc694e3e11804b5288740e9319928ee))
* **pegasus:** properly abort on connection close ([1b17f7a](https://github.com/Agoric/agoric-sdk/commit/1b17f7aa4de11ccd5a1ec26fc7b6fff017d70ac1))
* **pegasus:** rejectStuckTransfers, getRemoteDenomSubscription ([54bf0bc](https://github.com/Agoric/agoric-sdk/commit/54bf0bc4e83172396962295ba76b8af3a8846df9))
* implement persistent stores ([e1050b0](https://github.com/Agoric/agoric-sdk/commit/e1050b010e095b23547a38d48a12e5c8841a7466))


### Bug Fixes

* **pegasus:** more POLA and less global state ([e7ea320](https://github.com/Agoric/agoric-sdk/commit/e7ea32047f5a87a18c5ed4722d4d6e2163f7f2aa))
* **pegasus:** more robust ics20 JSON parsing ([208109f](https://github.com/Agoric/agoric-sdk/commit/208109f2e4df9e4df5c2371c6a299a42349d5c69))
* **pegasus:** only reject transfers waiting for pegRemote ([f1801f6](https://github.com/Agoric/agoric-sdk/commit/f1801f63ad81ec06fc3b86c3a44e98130b310351))
* **pegasus:** use bigints for nonces ([9065d6e](https://github.com/Agoric/agoric-sdk/commit/9065d6ee205082efd2253e6bd06ee08676535b50))
* **pegasus:** use dummy ICS20-1 transfer `sender` ([c4056bc](https://github.com/Agoric/agoric-sdk/commit/c4056bcd48800b6bfadb4de5eaccb66af6446ef4))
* `rejectStuckTransfers` sends a TransferProtocol-level error ([8374f94](https://github.com/Agoric/agoric-sdk/commit/8374f941597e22ac20f40b959381218f03563f65))
* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))



### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.5.0...@agoric/pegasus@0.5.1) (2021-12-22)

**Note:** Version bump only for package @agoric/pegasus





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.5...@agoric/pegasus@0.5.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **zoe:** must harden `amountKeywordRecord` before passing to ZCF objects

* chore: fix treasury errors, etc.

Co-authored-by: mergify[bot] <37929162+mergify[bot]@users.noreply.github.com>

### Bug Fixes

* **zoe:** assert that amountKeywordRecord is a copyRecord ([#4069](https://github.com/Agoric/agoric-sdk/issues/4069)) ([fe9a9ff](https://github.com/Agoric/agoric-sdk/commit/fe9a9ff3de86608a0b1f8f9547059f89d45b948d))



### [0.4.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.4...@agoric/pegasus@0.4.5) (2021-10-13)

**Note:** Version bump only for package @agoric/pegasus





### [0.4.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.3...@agoric/pegasus@0.4.4) (2021-09-23)

**Note:** Version bump only for package @agoric/pegasus





### [0.4.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.2...@agoric/pegasus@0.4.3) (2021-09-15)


### Bug Fixes

* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.1...@agoric/pegasus@0.4.2) (2021-08-21)

**Note:** Version bump only for package @agoric/pegasus





### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.4.0...@agoric/pegasus@0.4.1) (2021-08-18)

**Note:** Version bump only for package @agoric/pegasus





## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.12...@agoric/pegasus@0.4.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.3.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.11...@agoric/pegasus@0.3.12) (2021-08-16)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.8...@agoric/pegasus@0.3.11) (2021-08-15)

### 0.26.10 (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)



### [0.3.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.8...@agoric/pegasus@0.3.10) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)



### [0.3.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.8...@agoric/pegasus@0.3.9) (2021-07-28)


### Bug Fixes

* zoe/spawner/pegasus: use unlimited Meter, not metered: true ([04d4fd9](https://github.com/Agoric/agoric-sdk/commit/04d4fd96982ecd02de50f09fa38c6e2800cca527)), closes [#3308](https://github.com/Agoric/agoric-sdk/issues/3308)



### [0.3.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.7...@agoric/pegasus@0.3.8) (2021-07-01)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.6...@agoric/pegasus@0.3.7) (2021-07-01)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.5...@agoric/pegasus@0.3.6) (2021-06-28)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.4...@agoric/pegasus@0.3.5) (2021-06-25)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.3...@agoric/pegasus@0.3.4) (2021-06-24)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.2...@agoric/pegasus@0.3.3) (2021-06-24)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.1...@agoric/pegasus@0.3.2) (2021-06-23)

**Note:** Version bump only for package @agoric/pegasus





### [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.3.0...@agoric/pegasus@0.3.1) (2021-06-16)

**Note:** Version bump only for package @agoric/pegasus





## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.7...@agoric/pegasus@0.3.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **zoe:** new reallocate API to assist with reviewing conservation of rights (#3184)

### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))


### Code Refactoring

* **zoe:** new reallocate API to assist with reviewing conservation of rights ([#3184](https://github.com/Agoric/agoric-sdk/issues/3184)) ([f34e5ea](https://github.com/Agoric/agoric-sdk/commit/f34e5eae0812a9823d40d2d05ba98522c7846f2a))



## [0.2.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.6...@agoric/pegasus@0.2.7) (2021-05-10)

**Note:** Version bump only for package @agoric/pegasus





## [0.2.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.5...@agoric/pegasus@0.2.6) (2021-05-05)

**Note:** Version bump only for package @agoric/pegasus





## [0.2.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.4...@agoric/pegasus@0.2.5) (2021-05-05)


### Bug Fixes

* **pegasus:** update to new solo package ([cf91a04](https://github.com/Agoric/agoric-sdk/commit/cf91a04fa6ce53dc06de0ccb8c8173050134575a))





## [0.2.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.3...@agoric/pegasus@0.2.4) (2021-04-22)


### Bug Fixes

* rename cosmos-level tokens uagstake/uag to ubld/urun ([0557983](https://github.com/Agoric/agoric-sdk/commit/0557983210571c9c2ba801d68644d71641a3f790))





## [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.2...@agoric/pegasus@0.2.3) (2021-04-18)

**Note:** Version bump only for package @agoric/pegasus





## [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.1...@agoric/pegasus@0.2.2) (2021-04-16)

**Note:** Version bump only for package @agoric/pegasus





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/pegasus@0.2.0...@agoric/pegasus@0.2.1) (2021-04-14)

**Note:** Version bump only for package @agoric/pegasus





# 0.2.0 (2021-04-13)


### Bug Fixes

* adjust Pegasus to actually work correctly with pegRemote ([8cd8c72](https://github.com/Agoric/agoric-sdk/commit/8cd8c72bc5fa207471ac2fdd9ac750dbdda7c39f))


### Features

* install Pegasus on chain bootstrap ([7615292](https://github.com/Agoric/agoric-sdk/commit/76152926942f9c0610ab3d08a45c464856779643))
* integrate pegasus in chain bootstrap ([5c7ecba](https://github.com/Agoric/agoric-sdk/commit/5c7ecba05d0e6ec7ef9fe127ee89e0c79d3e6511))
* move Pegasus contract to SDK ([d0ca2cc](https://github.com/Agoric/agoric-sdk/commit/d0ca2cc155953c63eef5f56f236fa9280984730a))
