# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
