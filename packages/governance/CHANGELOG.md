# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

### [0.4.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.1...@agoric/governance@0.4.2) (2022-02-21)


### Bug Fixes

* Enhance TypeScript node_modules traversal depth ([000f738](https://github.com/Agoric/agoric-sdk/commit/000f73850d46dc7272b2399c06ad774dd3b8fe6e))
* extract early changes from PR 4136 ([#4190](https://github.com/Agoric/agoric-sdk/issues/4190)) ([fea822e](https://github.com/Agoric/agoric-sdk/commit/fea822ec75c27c8758b872730424c0a3f1a1c623))



### [0.4.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.4.0...@agoric/governance@0.4.1) (2021-12-22)


### Features

* refactor parameter governance support to allow for Invitations ([#4121](https://github.com/Agoric/agoric-sdk/issues/4121)) ([159596b](https://github.com/Agoric/agoric-sdk/commit/159596b8d44b8cbdaf6e19513cb3e716febfae7b))



## [0.4.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.3.0...@agoric/governance@0.4.0) (2021-12-02)


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



## [0.3.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.3...@agoric/governance@0.3.0) (2021-10-13)


### ⚠ BREAKING CHANGES

* add a claimsRegistrar based on attestations (#3622)

### Features

* add a claimsRegistrar based on attestations ([#3622](https://github.com/Agoric/agoric-sdk/issues/3622)) ([3acf78d](https://github.com/Agoric/agoric-sdk/commit/3acf78d786fedbc2fe02792383ebcc2cadaa8db2)), closes [#3189](https://github.com/Agoric/agoric-sdk/issues/3189) [#3473](https://github.com/Agoric/agoric-sdk/issues/3473) [#3932](https://github.com/Agoric/agoric-sdk/issues/3932)
* ContractGovernor manages parameter updating for a contract ([#3448](https://github.com/Agoric/agoric-sdk/issues/3448)) ([59ebde2](https://github.com/Agoric/agoric-sdk/commit/59ebde27708c0b3988f62a3626f9b092e148671f))


### Bug Fixes

* **governance:** export buildParamManager from index.js ([#3952](https://github.com/Agoric/agoric-sdk/issues/3952)) ([868964e](https://github.com/Agoric/agoric-sdk/commit/868964e09cac570cceda4617fd0723a0a64d1841))



### [0.2.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.2...@agoric/governance@0.2.3) (2021-09-23)

**Note:** Version bump only for package @agoric/governance





### [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.1...@agoric/governance@0.2.2) (2021-09-15)


### Bug Fixes

* better type declarations caught some non-bigInts ([1668094](https://github.com/Agoric/agoric-sdk/commit/1668094138e0819c56f578d544ba0a24b1c82443))
* more missing Fars. kill "this" ([#3746](https://github.com/Agoric/agoric-sdk/issues/3746)) ([7bd027a](https://github.com/Agoric/agoric-sdk/commit/7bd027a879f98a9a3f30429ee1b54e6057efec42))



### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.2.0...@agoric/governance@0.2.1) (2021-08-18)

**Note:** Version bump only for package @agoric/governance





## [0.2.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.10...@agoric/governance@0.2.0) (2021-08-17)


### ⚠ BREAKING CHANGES

* make the run mint within Zoe, and give only the treasury the ability to create a ZCFMint with it

* chore: change 'makeZoe' to 'makeZoeKit'

* chore: add "shutdownZoeVat" argument to Zoe, and pass it to `makeIssuerKit` for invitation issuerKit and fee issuerKit

* chore: manually lint-fix install-on-chain.js

See https://github.com/Agoric/agoric-sdk/issues/3672 for the issue to fix the root problem

* BREAKING CHANGE: create the RUN Mint within Zoe (#3647) ([48762aa](https://github.com/Agoric/agoric-sdk/commit/48762aa83a30eaa0a14b2fd87777456758594262)), closes [#3647](https://github.com/Agoric/agoric-sdk/issues/3647)



### [0.1.10](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.9...@agoric/governance@0.1.10) (2021-08-16)

**Note:** Version bump only for package @agoric/governance





### [0.1.9](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.9) (2021-08-15)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.8](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.8) (2021-08-14)

### 0.26.10 (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.7](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.6...@agoric/governance@0.1.7) (2021-07-28)


### Bug Fixes

* **governance:** use metered=true and xs-worker on all swingset tests ([5108c51](https://github.com/Agoric/agoric-sdk/commit/5108c51b73f28c86f06c90640c3f90265435b14a))
* some missing Fars ([#3498](https://github.com/Agoric/agoric-sdk/issues/3498)) ([8f77271](https://github.com/Agoric/agoric-sdk/commit/8f77271b41a4589679ad95ff907126778466aba8))



### [0.1.6](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.5...@agoric/governance@0.1.6) (2021-07-01)

**Note:** Version bump only for package @agoric/governance





### [0.1.5](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.4...@agoric/governance@0.1.5) (2021-06-28)

**Note:** Version bump only for package @agoric/governance





### [0.1.4](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.3...@agoric/governance@0.1.4) (2021-06-25)

**Note:** Version bump only for package @agoric/governance





### [0.1.3](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.2...@agoric/governance@0.1.3) (2021-06-24)

**Note:** Version bump only for package @agoric/governance





### [0.1.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/governance@0.1.1...@agoric/governance@0.1.2) (2021-06-24)

**Note:** Version bump only for package @agoric/governance





### 0.1.1 (2021-06-23)


### Features

* ballot counter for two-outcome elections ([#3233](https://github.com/Agoric/agoric-sdk/issues/3233)) ([6dddaa6](https://github.com/Agoric/agoric-sdk/commit/6dddaa617f1e0188e8f6f0f4660ddc7f746f60c9)), closes [#3185](https://github.com/Agoric/agoric-sdk/issues/3185)
