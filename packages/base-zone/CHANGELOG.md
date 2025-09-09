# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u22.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/base-zone@0.2.0-u22.0...@agoric/base-zone@0.2.0-u22.1) (2025-09-09)

**Note:** Version bump only for package @agoric/base-zone

## 0.2.0-u22.0 (2025-09-08)

### Features

* **base-zone:** add `zone.watchPromise` ([9ce80d0](https://github.com/Agoric/agoric-sdk/commit/9ce80d06c0a56471d2da9f372b0b2d93d31d159a))
* **base-zone:** alt revocable api using amplifier ([#8977](https://github.com/Agoric/agoric-sdk/issues/8977)) ([5cdf6e3](https://github.com/Agoric/agoric-sdk/commit/5cdf6e3a8b4fbb5cb8e276e6efeec65d9c3d6623))
* **base-zone:** attenuator as simplified revocable ([#11314](https://github.com/Agoric/agoric-sdk/issues/11314)) ([c962ba0](https://github.com/Agoric/agoric-sdk/commit/c962ba0771022947027b9bd76339a3ab21406b20))
* **base-zone:** expose `makeRevocableKit` for pure Exos ([b0b2af0](https://github.com/Agoric/agoric-sdk/commit/b0b2af0a7b5f8402abf836e126a9d7d758fed7dc))
* **base-zone:** new package ([b7bc677](https://github.com/Agoric/agoric-sdk/commit/b7bc677238eee5969ac0a95dc066434ef676216e))
* **types:** generic zone.mapStore ([a9b055d](https://github.com/Agoric/agoric-sdk/commit/a9b055dcab34b9c9b136dd430e1e2251d80c5039))
* **watchUtils:** handle non-storables ([8c27c67](https://github.com/Agoric/agoric-sdk/commit/8c27c6725ba7ef4b71d3ab0ccfdbddd755bcd926))

### Bug Fixes

* **base-zone,zone:** import `isPassable` from @endo/pass-style ([#9230](https://github.com/Agoric/agoric-sdk/issues/9230)) ([fbd8633](https://github.com/Agoric/agoric-sdk/commit/fbd8633ae9f8420a589dd9bc32925418f2dde060))
* **base-zone:** Oops. Forgot to export `prepareAttenuatorMaker` ([#11315](https://github.com/Agoric/agoric-sdk/issues/11315)) ([af493a9](https://github.com/Agoric/agoric-sdk/commit/af493a9026387fc69cbfd57486f00fd33608594d)), closes [#11314](https://github.com/Agoric/agoric-sdk/issues/11314) [#11314](https://github.com/Agoric/agoric-sdk/issues/11314)
