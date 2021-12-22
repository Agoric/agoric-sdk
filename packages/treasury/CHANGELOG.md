# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.7.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.7.0...@agoric/treasury@0.7.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))


### Bug Fixes

* **treasury:** use liquidationMargin for maxDebt calculation ([#4163](https://github.com/Agoric/agoric-sdk/issues/4163)) ([c749af8](https://github.com/Agoric/agoric-sdk/commit/c749af86232029c0abc8b031366251a05e482930))



## [0.7.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.5...@agoric/treasury@0.7.0) (2021-12-02)


### ⚠ BREAKING CHANGES

* **zoe:** must harden `amountKeywordRecord` before passing to ZCF objects

* chore: fix treasury errors, etc.

Co-authored-by: mergify[bot] <37929162+mergify[bot]@users.noreply.github.com>
* **ERTP:** NatValues now only accept bigints, lower-case amountMath is removed, and AmountMath methods always follow the order of: brand, value

* chore: fix up INPUT_VALIDATON.md

* chore: address PR comments

### Bug Fixes

* **zoe:** assert that amountKeywordRecord is a copyRecord ([#4069](https://github.com/Agoric/agoric-sdk/issues/4069)) ([fe9a9ff](https://github.com/Agoric/agoric-sdk/commit/fe9a9ff3de86608a0b1f8f9547059f89d45b948d))


### Miscellaneous Chores

* **ERTP:** additional input validation and clean up ([#3892](https://github.com/Agoric/agoric-sdk/issues/3892)) ([067ea32](https://github.com/Agoric/agoric-sdk/commit/067ea32b069596202d7f8e7c5e09d5ea7821f6b2))



### [0.6.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.4...@agoric/treasury@0.6.5) (2021-10-13)

**Note:** Version bump only for package @agoric/treasury





### [0.6.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.3...@agoric/treasury@0.6.4) (2021-09-23)

**Note:** Version bump only for package @agoric/treasury





### [0.6.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.2...@agoric/treasury@0.6.3) (2021-09-15)

**Note:** Version bump only for package @agoric/treasury





### [0.6.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.1...@agoric/treasury@0.6.2) (2021-08-21)

**Note:** Version bump only for package @agoric/treasury





### [0.6.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.6.0...@agoric/treasury@0.6.1) (2021-08-18)

**Note:** Version bump only for package @agoric/treasury





## [0.6.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.12...@agoric/treasury@0.6.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

### Features

* **treasury:** assert getBootstrapPayment amount ([3ed8e69](https://github.com/Agoric/agoric-sdk/commit/3ed8e695deb9a0f6c5d924374e61ceb8d9aaff1c))


### Bug Fixes

* return funds from liquidation via a seat payout ([#3656](https://github.com/Agoric/agoric-sdk/issues/3656)) ([d1a142d](https://github.com/Agoric/agoric-sdk/commit/d1a142d47ae0cf3db6512e85ac2de583193a2fdf))


* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.5.12](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.11...@agoric/treasury@0.5.12) (2021-08-16)

**Note:** Version bump only for package @agoric/treasury





### [0.5.11](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.11) (2021-08-15)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.10) (2021-08-14)


### Bug Fixes

* Treasury burn debt repayment before zeroing the amount owed ([#3604](https://github.com/Agoric/agoric-sdk/issues/3604)) ([f0bc4cb](https://github.com/Agoric/agoric-sdk/commit/f0bc4cb0c7e419cafc0105869d287d571202448d)), closes [#3495](https://github.com/Agoric/agoric-sdk/issues/3495)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.8...@agoric/treasury@0.5.9) (2021-07-28)


### Bug Fixes

* **treasury:** use xs-worker and metered=true on all swingset tests ([f76405e](https://github.com/Agoric/agoric-sdk/commit/f76405e09a29f4975cda00a33bbde4761dbe958e))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.5.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.7...@agoric/treasury@0.5.8) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.6...@agoric/treasury@0.5.7) (2021-07-01)

**Note:** Version bump only for package @agoric/treasury





### [0.5.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.5...@agoric/treasury@0.5.6) (2021-06-28)

**Note:** Version bump only for package @agoric/treasury





### [0.5.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.4...@agoric/treasury@0.5.5) (2021-06-25)

**Note:** Version bump only for package @agoric/treasury





### [0.5.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.3...@agoric/treasury@0.5.4) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.2...@agoric/treasury@0.5.3) (2021-06-24)

**Note:** Version bump only for package @agoric/treasury





### [0.5.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.1...@agoric/treasury@0.5.2) (2021-06-23)

**Note:** Version bump only for package @agoric/treasury





### [0.5.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.5.0...@agoric/treasury@0.5.1) (2021-06-16)

**Note:** Version bump only for package @agoric/treasury





## [0.5.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.2...@agoric/treasury@0.5.0) (2021-06-15)


### ⚠ BREAKING CHANGES

* **zoe:** new reallocate API to assist with reviewing conservation of rights (#3184)

### Bug Fixes

* Pin ESM to forked version ([54dbb55](https://github.com/Agoric/agoric-sdk/commit/54dbb55d64d7ff7adb395bc4bd9d1461dd2d3c17))
* Preinitialize Babel ([bb76808](https://github.com/Agoric/agoric-sdk/commit/bb768089c3588e54612d7c9a4528972b5688f4e6))


### Code Refactoring

* **zoe:** new reallocate API to assist with reviewing conservation of rights ([#3184](https://github.com/Agoric/agoric-sdk/issues/3184)) ([f34e5ea](https://github.com/Agoric/agoric-sdk/commit/f34e5eae0812a9823d40d2d05ba98522c7846f2a))



## [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.1...@agoric/treasury@0.4.2) (2021-05-10)

**Note:** Version bump only for package @agoric/treasury





## [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.4.0...@agoric/treasury@0.4.1) (2021-05-05)

**Note:** Version bump only for package @agoric/treasury





# [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.4...@agoric/treasury@0.4.0) (2021-05-05)


### Bug Fixes

* default and propagate the poolFee and protocolFee in treasury ([d210bcf](https://github.com/Agoric/agoric-sdk/commit/d210bcf1427bee73c9a13f0a00ee2a757d978cd2))
* have the treasury use the newSwap AMM implementation ([ed6b84a](https://github.com/Agoric/agoric-sdk/commit/ed6b84ad02cdf59431aa92d3d1e8c8e669379881))
* polishing touches ([334a253](https://github.com/Agoric/agoric-sdk/commit/334a253c02dc1c74117237f6ae18b31505e635af))


### Features

* share one instance of liquidation across all vaultManagers ([#2869](https://github.com/Agoric/agoric-sdk/issues/2869)) ([0ae776a](https://github.com/Agoric/agoric-sdk/commit/0ae776a91d0ec77443073f6340e714b8e161e062))





## [0.3.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.3...@agoric/treasury@0.3.4) (2021-04-22)

**Note:** Version bump only for package @agoric/treasury





## [0.3.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.2...@agoric/treasury@0.3.3) (2021-04-18)

**Note:** Version bump only for package @agoric/treasury





## [0.3.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.1...@agoric/treasury@0.3.2) (2021-04-16)

**Note:** Version bump only for package @agoric/treasury





## [0.3.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.3.0...@agoric/treasury@0.3.1) (2021-04-14)

**Note:** Version bump only for package @agoric/treasury





# [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.1...@agoric/treasury@0.3.0) (2021-04-13)


### Features

* move Pegasus contract to SDK ([d0ca2cc](https://github.com/Agoric/agoric-sdk/commit/d0ca2cc155953c63eef5f56f236fa9280984730a))





## [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/treasury@0.2.0...@agoric/treasury@0.2.1) (2021-04-07)

**Note:** Version bump only for package @agoric/treasury





# 0.2.0 (2021-04-06)


### Bug Fixes

* allow liq margin plus fees for new loans ([#2813](https://github.com/Agoric/agoric-sdk/issues/2813)) ([5284548](https://github.com/Agoric/agoric-sdk/commit/52845480aa18dd76165b7997bcb2b4fad3e7c3be))
* improve factoring and assertions ([e7b356d](https://github.com/Agoric/agoric-sdk/commit/e7b356d608e7a774fb326e0b8988c7c79b938e72))
* update install-on-chain to use RUN instead of SCONES ([#2815](https://github.com/Agoric/agoric-sdk/issues/2815)) ([6ba74e9](https://github.com/Agoric/agoric-sdk/commit/6ba74e98e6cea423098646426bb136780f6f8ff4))
* update to ses 0.12.7, ses-ava 0.1.1 ([#2820](https://github.com/Agoric/agoric-sdk/issues/2820)) ([6d81775](https://github.com/Agoric/agoric-sdk/commit/6d81775715bc80e6033d75cb65edbfb1452b1608))


### Features

* add collateralConfig to issuer entries and enact ([8ce966b](https://github.com/Agoric/agoric-sdk/commit/8ce966bdb4f74960189b73d0721e92ae3c5912f0))
* add more collateral types, pivot to BLD/RUN and decimals ([7cbce9f](https://github.com/Agoric/agoric-sdk/commit/7cbce9f53fc81d273d3ebd7c78d93caedbd23b2e))
* introduce @agoric/treasury and pass tests ([6257231](https://github.com/Agoric/agoric-sdk/commit/6257231e23cd501e6e20ef16e4f4d569ff30b265))
* use multipoolAutoswap as the treasury priceAuthority ([a37c795](https://github.com/Agoric/agoric-sdk/commit/a37c795a98f38ac99581d441e00177364f404bd3))
