# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
