# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.11.0-u22.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-xsnap-supervisor@0.10.2...@agoric/swingset-xsnap-supervisor@0.11.0-u22.0) (2025-09-08)

### Features

* validate SwingSetCapData ([fbc439f](https://github.com/Agoric/agoric-sdk/commit/fbc439f4d884b04ac7970ac84a44e66a6be1b76c))

### Bug Fixes

* endow with original unstructured `assert` ([#9514](https://github.com/Agoric/agoric-sdk/issues/9514)) ([f908f89](https://github.com/Agoric/agoric-sdk/commit/f908f89186162df83b540f6aeb1f4c665c3a56b4)), closes [#9515](https://github.com/Agoric/agoric-sdk/issues/9515) [#5672](https://github.com/Agoric/agoric-sdk/issues/5672) [#8332](https://github.com/Agoric/agoric-sdk/issues/8332) [#9513](https://github.com/Agoric/agoric-sdk/issues/9513) [#9515](https://github.com/Agoric/agoric-sdk/issues/9515) [#5672](https://github.com/Agoric/agoric-sdk/issues/5672) [#5672](https://github.com/Agoric/agoric-sdk/issues/5672) [#9513](https://github.com/Agoric/agoric-sdk/issues/9513) [#9513](https://github.com/Agoric/agoric-sdk/issues/9513)
* ensure script main rejections exit with error ([abdab87](https://github.com/Agoric/agoric-sdk/commit/abdab879014a5c3124ebd0e9246995ac6b1ce6e5))
* **swingset-xsnap-supervisor:** Add missing promise-kit dependency ([9d6dbc4](https://github.com/Agoric/agoric-sdk/commit/9d6dbc41a02dfaf249c1bbf48cc14422c0777532))

### [0.10.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-xsnap-supervisor@0.10.1...@agoric/swingset-xsnap-supervisor@0.10.2) (2023-06-02)

**Note:** Version bump only for package @agoric/swingset-xsnap-supervisor

### [0.10.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/swingset-xsnap-supervisor@0.10.0...@agoric/swingset-xsnap-supervisor@0.10.1) (2023-05-24)

**Note:** Version bump only for package @agoric/swingset-xsnap-supervisor

## 0.10.0 (2023-05-19)

### Features

* add APIs for tracking/debugging undesired object retention (aka "leaks") ([0a7221b](https://github.com/Agoric/agoric-sdk/commit/0a7221b3c04f3b2894c30346fa2ea6fb0130c046)), closes [#7318](https://github.com/Agoric/agoric-sdk/issues/7318)
* extract swingset-xsnap-supervisor out to a separate package ([0024f01](https://github.com/Agoric/agoric-sdk/commit/0024f0128ff658c93468069b6fa5cc3bebfbdc78)), closes [#6596](https://github.com/Agoric/agoric-sdk/issues/6596)

### Bug Fixes

* don't retain a vat's raw bundle string after use ([1dda5ef](https://github.com/Agoric/agoric-sdk/commit/1dda5ef23e8fa624942a580487b3c94595eae5c3)), closes [#6981](https://github.com/Agoric/agoric-sdk/issues/6981)
