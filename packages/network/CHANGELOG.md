# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [0.2.0-u19.2](https://github.com/Agoric/agoric-sdk/compare/@agoric/network@0.2.0-u19.1...@agoric/network@0.2.0-u19.2) (2025-03-13)

**Note:** Version bump only for package @agoric/network





## [0.2.0-u19.1](https://github.com/Agoric/agoric-sdk/compare/@agoric/network@0.2.0-u19.0...@agoric/network@0.2.0-u19.1) (2025-03-03)

**Note:** Version bump only for package @agoric/network





## 0.2.0-u19.0 (2025-02-24)


### ⚠ BREAKING CHANGES

* **network:** improve naming and data coercion
* make Network and IBC vats durable (#8721)

### Features

* make Network and IBC vats durable ([#8721](https://github.com/Agoric/agoric-sdk/issues/8721)) ([3d13c09](https://github.com/Agoric/agoric-sdk/commit/3d13c09363013e23726c2ac5fa299a8e5344fd8c))
* **network:** add `allocateICQControllerPort` to PortAllocator ([b819aa9](https://github.com/Agoric/agoric-sdk/commit/b819aa912890a93be1775beb7cd540fe5d91b8aa)), closes [#9072](https://github.com/Agoric/agoric-sdk/issues/9072)
* **types:** explicit exports from network ([65c2075](https://github.com/Agoric/agoric-sdk/commit/65c2075021dfb0ecf62a6009f7c411c7c49eb624))


### Bug Fixes

* **lint:** addressing lint errors ([bfe10d9](https://github.com/Agoric/agoric-sdk/commit/bfe10d9cc3878c322ca624a3a603e80f94dc6970))
* **network:** Connection should have negotiated remoteAddress and localAddress ([2184ea3](https://github.com/Agoric/agoric-sdk/commit/2184ea3d655c1334653e27d163a09ceb5f61fd50)), closes [#9064](https://github.com/Agoric/agoric-sdk/issues/9064)
* **network:** create and use `coerceToData` ([39beecb](https://github.com/Agoric/agoric-sdk/commit/39beecba84ef6dfafca902a28a651dbba77cdb1e))
* **network:** improve naming and data coercion ([8bcd9e2](https://github.com/Agoric/agoric-sdk/commit/8bcd9e2100f4973fd788a6edf42c144d916c173d))
* **network:** introduce `Finalizer` to close network ([54b9b00](https://github.com/Agoric/agoric-sdk/commit/54b9b009fff3fd3ab54f731adee97195acaa238f))
* **network:** use new `ERef` and `FarRef` ([3027adf](https://github.com/Agoric/agoric-sdk/commit/3027adf8613154dec167c5fccf5f207f6d2af701))
* **network:** use vow types, correct revealed problems ([d1c1240](https://github.com/Agoric/agoric-sdk/commit/d1c1240bcf534a316533d4c203f45f01fdfc825d))
* **vats:** `vtransfer` code cleanup ([8ac8197](https://github.com/Agoric/agoric-sdk/commit/8ac819709ef9ced0badee25e6715a5847b1e3f4c))
