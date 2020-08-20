# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.8.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.7.0...@agoric/zoe@0.8.0) (2020-08-20)


### Bug Fixes

* `ERef<T>` is `T | PromiseLike<T>` ([#1383](https://github.com/Agoric/agoric-sdk/issues/1383)) ([8ef4d66](https://github.com/Agoric/agoric-sdk/commit/8ef4d662dc80daf80420c0c531c2abe41517b6cd))
* add tests & fix for ZCF handling of crashes in contract code ([3cccf66](https://github.com/Agoric/agoric-sdk/commit/3cccf66cb85e91c6db10ed9530ec01f596e4cc8a))
* deduplicate redundant work ([#1550](https://github.com/Agoric/agoric-sdk/issues/1550)) ([b89651c](https://github.com/Agoric/agoric-sdk/commit/b89651c6355a058f97b4719be336a31a3ef273b4))
* deprecate getMathHelpersName for getMathHelperName ([#1409](https://github.com/Agoric/agoric-sdk/issues/1409)) ([2375b28](https://github.com/Agoric/agoric-sdk/commit/2375b28c1aadf8116c3665cec0ef0397e6a91102))
* excise @agoric/harden from the codebase ([eee6fe1](https://github.com/Agoric/agoric-sdk/commit/eee6fe1153730dec52841c9eb4c056a8c5438b0f))
* kickOut takes a `reason` error rather than a `message` string ([#1567](https://github.com/Agoric/agoric-sdk/issues/1567)) ([c3cd536](https://github.com/Agoric/agoric-sdk/commit/c3cd536f16dcf30208d88fb1c81376aa916e2a40))
* many small review comments ([#1533](https://github.com/Agoric/agoric-sdk/issues/1533)) ([ee8f782](https://github.com/Agoric/agoric-sdk/commit/ee8f782578ff4f2ea9e0ec557e14d1f52c795ca9))
* match notifier semantics to async iterables ([#1332](https://github.com/Agoric/agoric-sdk/issues/1332)) ([efbf359](https://github.com/Agoric/agoric-sdk/commit/efbf359e7f1b4ca0eb07e3ae8a12e1f061758927))
* reduce inconsistency among our linting rules ([#1492](https://github.com/Agoric/agoric-sdk/issues/1492)) ([b6b675e](https://github.com/Agoric/agoric-sdk/commit/b6b675e2de110e2af19cad784a66220cab21dacf))
* rename produceNotifier to makeNotifierKit ([#1330](https://github.com/Agoric/agoric-sdk/issues/1330)) ([e5034f9](https://github.com/Agoric/agoric-sdk/commit/e5034f94e33e9c90c6a8fcaff70c11773e13e969))
* rename producePromise to makePromiseKit ([#1329](https://github.com/Agoric/agoric-sdk/issues/1329)) ([1d2925a](https://github.com/Agoric/agoric-sdk/commit/1d2925ad640cce7b419751027b44737bd46a6d59))
* set the simpleExchange notifier's initial order book state ([70c17fd](https://github.com/Agoric/agoric-sdk/commit/70c17fdffbdf84e9999aac962300ffc23698a8ca))
* tweak more types, make getVatAdmin into a function ([8c1e9d2](https://github.com/Agoric/agoric-sdk/commit/8c1e9d21fbdb7fa652100d98d5fdb13ad406f03f))
* **zoe:** don't [@typedef](https://github.com/typedef) areRightsConserved ([281f7b1](https://github.com/Agoric/agoric-sdk/commit/281f7b1413e570b3a2f7fa9509c74f22030b3936))
* **zoe:** unify InstanceRecord usage (.instanceHandle -> .handle) ([9af7903](https://github.com/Agoric/agoric-sdk/commit/9af790322fc84a3aa1e41e957614fea2873c63b1))
* update JS typings ([20941e6](https://github.com/Agoric/agoric-sdk/commit/20941e675302ee5905e4825638e661065ad5d3f9))


### Features

* adaptors between notifiers and async iterables ([#1340](https://github.com/Agoric/agoric-sdk/issues/1340)) ([b67d21a](https://github.com/Agoric/agoric-sdk/commit/b67d21aae7e66202e3a5a3f13c7bd5769061230e))
* add getIssuerForBrand to zoe ([#1276](https://github.com/Agoric/agoric-sdk/issues/1276)) ([4fe3c83](https://github.com/Agoric/agoric-sdk/commit/4fe3c83a70000cb9f933bf6e158cc2bc1862bae9))
* ERTP v0.7.0 ([#1317](https://github.com/Agoric/agoric-sdk/issues/1317)) ([2d66b5a](https://github.com/Agoric/agoric-sdk/commit/2d66b5ae1feaeef1024fc6bfac7066a385ed5207)), closes [#1306](https://github.com/Agoric/agoric-sdk/issues/1306) [#1305](https://github.com/Agoric/agoric-sdk/issues/1305)
* make production Zoe use prebundled zcf ([138ddd7](https://github.com/Agoric/agoric-sdk/commit/138ddd70cba6e1b11a4a8c0d59f15a018f8bb0e6))
* Zoe support for prebundled zcf ([60050a5](https://github.com/Agoric/agoric-sdk/commit/60050a5be51ebe47ae1365fe134a4ea222b010c0))





# [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.2...@agoric/zoe@0.7.0) (2020-06-30)


### Bug Fixes

* ensure keywords do not collide with numbers ([#1133](https://github.com/Agoric/agoric-sdk/issues/1133)) ([15623f3](https://github.com/Agoric/agoric-sdk/commit/15623f333928dc57fc07085f246a419f916ef4c0))
* replace openDetail with quoting q ([#1134](https://github.com/Agoric/agoric-sdk/issues/1134)) ([67808a4](https://github.com/Agoric/agoric-sdk/commit/67808a4df515630ef7dc77c59054382f626ece96))


### Features

* **zoe:** Zoe release 0.7.0 ([#1143](https://github.com/Agoric/agoric-sdk/issues/1143)) ([4a14455](https://github.com/Agoric/agoric-sdk/commit/4a14455e10f1e3807fd6633594c86a0f60026393))





## [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.1...@agoric/zoe@0.6.2) (2020-05-17)


### Bug Fixes

* fix typedef for makeInstance (was erroring incorrectly) and give better error message for an invalid installationHandle ([#1109](https://github.com/Agoric/agoric-sdk/issues/1109)) ([4b352fc](https://github.com/Agoric/agoric-sdk/commit/4b352fc7f399a479d82181158d4d61e63790b31f))
* fix Zoe bug in which offer safety can be violated ([#1115](https://github.com/Agoric/agoric-sdk/issues/1115)) ([39d6ae2](https://github.com/Agoric/agoric-sdk/commit/39d6ae26dd1aaec737ae0f9a47af5c396868c188)), closes [#1076](https://github.com/Agoric/agoric-sdk/issues/1076)





## [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.6.0...@agoric/zoe@0.6.1) (2020-05-10)


### Bug Fixes

* filter proposal give and want by sparseKeywords in zcf.reallocate ([#1076](https://github.com/Agoric/agoric-sdk/issues/1076)) ([fb36a40](https://github.com/Agoric/agoric-sdk/commit/fb36a406e628765376797ab3663272402d3584b3))





# [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.5.0...@agoric/zoe@0.6.0) (2020-05-04)


### Bug Fixes

* demonstrate and fix a bug with mis-spelled liquidityTokenSupply ([2161b42](https://github.com/Agoric/agoric-sdk/commit/2161b422ccb23f338d500fb60bba71a51bf3b670))
* improve handling of orders that are consummated immediately ([61e4b67](https://github.com/Agoric/agoric-sdk/commit/61e4b673014b81d8336d64059eb9a1ea46629eae)), closes [#13](https://github.com/Agoric/agoric-sdk/issues/13)
* throw if values are undefined ([7be77e5](https://github.com/Agoric/agoric-sdk/commit/7be77e5b39d70ae5d2da704ce8b5f575ec66059e))
* **assert:** slightly better assert logging ([#919](https://github.com/Agoric/agoric-sdk/issues/919)) ([47b3729](https://github.com/Agoric/agoric-sdk/commit/47b3729aa6b4ebde0d23cf791c5295fcf8f58a00))
* **zoe:** separate inviteHandle vs offerHandle ([#942](https://github.com/Agoric/agoric-sdk/issues/942)) ([1d85f97](https://github.com/Agoric/agoric-sdk/commit/1d85f97850ead03ac8e62c6e76405467914a2e84))
* use the new (typed) harden package ([2eb1af0](https://github.com/Agoric/agoric-sdk/commit/2eb1af08fe3967629a3ce165752fd501a5c85a96))
* **zoe:** Invitation to offer refactored to use upcall ([#853](https://github.com/Agoric/agoric-sdk/issues/853)) ([c142b7a](https://github.com/Agoric/agoric-sdk/commit/c142b7a64e77262927da22bde3af5793a9d39c2a))


### Features

* Add a notifier facility for Zoe and contracts ([335e009](https://github.com/Agoric/agoric-sdk/commit/335e00915bf37b2232cbcce8d15fb188bc70b0d6))
* connect notifier to wallet for SimpleExchange ([6d270f8](https://github.com/Agoric/agoric-sdk/commit/6d270f87a1788ad08526f929fc8165eaf7a61e3b))
* rename the registrar to be registry in "home" ([7603edb](https://github.com/Agoric/agoric-sdk/commit/7603edb8abed8573282337a66f6af506e8715f8c))
* SimpleExchange use notifier to announce changes to book orders ([efdd214](https://github.com/Agoric/agoric-sdk/commit/efdd214c705b099d499e039673d58f5e7584ab17))





# [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.5.0-alpha.0...@agoric/zoe@0.5.0) (2020-04-13)

**Note:** Version bump only for package @agoric/zoe





# [0.5.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.4.0...@agoric/zoe@0.5.0-alpha.0) (2020-04-12)


### Bug Fixes

* increase level of contract console.log to console.info ([00156f2](https://github.com/Agoric/agoric-sdk/commit/00156f235abb1b87db1c5ab0bd5155c2f3615382))
* **zoe:** ensure offers have the same instance handle as the contract calling the contract facet method ([#910](https://github.com/Agoric/agoric-sdk/issues/910)) ([0ffe65f](https://github.com/Agoric/agoric-sdk/commit/0ffe65faa5baccb114d0d91540cd9578606d7646))
* revive the ability of a zoe client to get access to the code. ([1ad9265](https://github.com/Agoric/agoric-sdk/commit/1ad926519cc6ca14aadc2a328d89f0d400a8bc95)), closes [#877](https://github.com/Agoric/agoric-sdk/issues/877)
* update checkIfProposal and rejectIfNotProposal ([7cdf09d](https://github.com/Agoric/agoric-sdk/commit/7cdf09dec9740a167c4c1d5770e82774961a5ae0))
* **zoe:** improve assertSubset error message ([#873](https://github.com/Agoric/agoric-sdk/issues/873)) ([4c6f11f](https://github.com/Agoric/agoric-sdk/commit/4c6f11f1931342fd09b3170183e3df77bed0d678))


### Features

* allow sparse keywords ([#812](https://github.com/Agoric/agoric-sdk/issues/812)) ([dcc9ba3](https://github.com/Agoric/agoric-sdk/commit/dcc9ba3413d096c78df9f8b184991c3bfd83ace3)), closes [#391](https://github.com/Agoric/agoric-sdk/issues/391)
* Check that makeInstance() returns an actual invite ([546d2ef](https://github.com/Agoric/agoric-sdk/commit/546d2ef69ca8e2c2c3ad17c0b78083b281cb3a9a)), closes [#820](https://github.com/Agoric/agoric-sdk/issues/820)





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.4.0-alpha.0...@agoric/zoe@0.4.0) (2020-04-02)

**Note:** Version bump only for package @agoric/zoe





# [0.4.0-alpha.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zoe@0.3.0...@agoric/zoe@0.4.0-alpha.0) (2020-04-02)


### Features

* allow optional arguments to redeem ([e930944](https://github.com/Agoric/agoric-sdk/commit/e930944390cc85ce287a87c25005e76891fa92d1))





# 0.3.0 (2020-03-26)


### Bug Fixes

* address PR comments ([b9ed6b5](https://github.com/Agoric/agoric-sdk/commit/b9ed6b5a510433af968ba233d4e943b939defa1b))
* propagate makeContract exceptions ([9a3cc18](https://github.com/Agoric/agoric-sdk/commit/9a3cc187b7ee75c446610cc3a101dfd0f557ea66))
* reinstate console endowment needed for Zoe contract debugging ([851d1ec](https://github.com/Agoric/agoric-sdk/commit/851d1ec78bba30c70571f400c8525c654338c641))
* revert Zoe change ([#775](https://github.com/Agoric/agoric-sdk/issues/775)) ([9212818](https://github.com/Agoric/agoric-sdk/commit/9212818d71e0906a7be343eda6acd37e634008be))
* wait for payments at opportune moments ([53f359d](https://github.com/Agoric/agoric-sdk/commit/53f359d56c49ef62a90e1e834b359de8ca5dfa4f))
* **metering:** properly reset for each crank ([ba191fe](https://github.com/Agoric/agoric-sdk/commit/ba191fe3435905e3d2ea5ab016571d1943d84bec))
* **metering:** refactor names and implementation ([f1410f9](https://github.com/Agoric/agoric-sdk/commit/f1410f91fbee61903e82a81368675eef4fa0b836))


### Features

* make ERTP methods acccept promises or payments ([4b7f060](https://github.com/Agoric/agoric-sdk/commit/4b7f06048bb0f86c2028a9c9cfae8ff90b595bd7))
* **nestedEvaluate:** support new moduleFormat ([deb8ee7](https://github.com/Agoric/agoric-sdk/commit/deb8ee73437cb86ef98c160239c931305fb370ad))
* **spawner:** implement basic metering ([8bd495c](https://github.com/Agoric/agoric-sdk/commit/8bd495ce64ab20a4f7e78999846afe1f9bce96a4))
* **zoe:** implement metering of contracts ([9138801](https://github.com/Agoric/agoric-sdk/commit/91388010a4c78741f27896d21df8e610c3ff3b16))
