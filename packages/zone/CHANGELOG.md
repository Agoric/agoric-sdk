# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.3.0-u20.0](https://github.com/Agoric/agoric-sdk/compare/@agoric/zone@0.2.2...@agoric/zone@0.3.0-u20.0) (2025-04-16)


### ⚠ BREAKING CHANGES

* **zone:** use fresh heap and virtual zones

### Features

* **base-zone:** add `zone.watchPromise` ([9ce80d0](https://github.com/Agoric/agoric-sdk/commit/9ce80d06c0a56471d2da9f372b0b2d93d31d159a))
* **liveslots-tools:** prepare-strict-test-env ([d98d894](https://github.com/Agoric/agoric-sdk/commit/d98d89449d4bfc1419cd4410edef813db0e4ec55))
* **zone:** implement `isStorable` for virtual zones ([20feefb](https://github.com/Agoric/agoric-sdk/commit/20feefbdef9aec159d32d3b2c6d266e4109ced99))
* **zone:** implement `zone.makeOnce(key, maker)` ([d3be4c0](https://github.com/Agoric/agoric-sdk/commit/d3be4c08477d958c1760713a88d33de724d6e3a2))
* **zone:** use fresh heap and virtual zones ([7a1a411](https://github.com/Agoric/agoric-sdk/commit/7a1a411cf719477e29a2bedeb91794fd633989e9))


### Bug Fixes

* **base-zone,zone:** import `isPassable` from @endo/pass-style ([#9230](https://github.com/Agoric/agoric-sdk/issues/9230)) ([fbd8633](https://github.com/Agoric/agoric-sdk/commit/fbd8633ae9f8420a589dd9bc32925418f2dde060))
* review suggestions ([ea28367](https://github.com/Agoric/agoric-sdk/commit/ea283670a4d702a8292b673ab4851610eaed50da))
* update TS types ([7580805](https://github.com/Agoric/agoric-sdk/commit/75808055afc129c81b7978fb83c33cfed7a4ecbd))
* **zone:** add `wrapProvider` and manage `backingStore` ([5e3f6a6](https://github.com/Agoric/agoric-sdk/commit/5e3f6a66dc2f1af89f3e5ddc5f9974f430beecc3))
* **zone:** fixups before merging to 7891 ([9bbb393](https://github.com/Agoric/agoric-sdk/commit/9bbb393ac2d0af8e2a3b29adfeabf01c42d9b50e))
* **zone:** Ignore type error that occurrs only integration with vats ([014fb5b](https://github.com/Agoric/agoric-sdk/commit/014fb5ba6fb997bb408eaa31a87fc95f2fac16fe))
* **zone:** review suggestion ([2ca7943](https://github.com/Agoric/agoric-sdk/commit/2ca7943f9f844e8526624b5db4977ff70bda95c1))
* **zone:** suggestions for [#7891](https://github.com/Agoric/agoric-sdk/issues/7891) ([e9e0e21](https://github.com/Agoric/agoric-sdk/commit/e9e0e219618449b532ea6303c58415f591b2b49f))
* **zone:** track baggage keys as used by `@agoric/vat-data` ([ac92686](https://github.com/Agoric/agoric-sdk/commit/ac9268664eb20e12ee87282b85aebf117af6c9f5))
* **zone:** update typing infrastructure ([70bdfa4](https://github.com/Agoric/agoric-sdk/commit/70bdfa4e005c28a36bc6f5e4b9e53cd2b8ae0b6e))



### [0.2.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/zone@0.2.1...@agoric/zone@0.2.2) (2023-06-02)

**Note:** Version bump only for package @agoric/zone





### [0.2.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/zone@0.2.0...@agoric/zone@0.2.1) (2023-05-24)

**Note:** Version bump only for package @agoric/zone





## 0.2.0 (2023-05-19)


### Features

* **zone:** check baggage ([62e8a75](https://github.com/Agoric/agoric-sdk/commit/62e8a750ea87227e79c15f798d359d112c495f7f))
* **zone:** first cut at `@agoric/zone` ([8b5e8e4](https://github.com/Agoric/agoric-sdk/commit/8b5e8e411423917bcb805aeacdba222eff35edd5))
